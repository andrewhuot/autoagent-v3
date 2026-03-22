"""Training session lifecycle, strategy, and briefing endpoints."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.error_handling import commit_with_rollback
from app.core.live import live_manager
from app.engine import BriefingGenerator, StrategyGenerator
from app.models.entities import AgentTree, EvalSuite, Experiment, ResearchMemory, TrainingSession
from app.models.enums import SessionStatus
from app.schemas.domain import BriefingResponse, TrainingSessionCreate, TrainingSessionRead, WizardConfigRequest

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("/", response_model=list[TrainingSessionRead])
def list_sessions(tree_id: str | None = None, db: Session = Depends(get_db)) -> list[TrainingSession]:
    """List training sessions, optionally by tree."""

    query = db.query(TrainingSession)
    if tree_id:
        query = query.filter(TrainingSession.tree_id == tree_id)
    return query.order_by(TrainingSession.started_at.desc().nulls_last()).all()


@router.post("/", response_model=TrainingSessionRead)
def create_session(payload: TrainingSessionCreate, db: Session = Depends(get_db)) -> TrainingSession:
    """Create a draft training session."""

    tree = db.get(AgentTree, payload.tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    eval_suite = db.get(EvalSuite, payload.eval_suite_id)
    if not eval_suite:
        raise HTTPException(status_code=404, detail="Eval suite not found")
    if eval_suite.tree_id != tree.id:
        raise HTTPException(status_code=400, detail="Eval suite does not belong to the provided tree")

    session = TrainingSession(
        tree_id=payload.tree_id,
        eval_suite_id=payload.eval_suite_id,
        strategy_md=payload.strategy_md,
        allowed_levels=payload.allowed_levels,
        config=payload.config,
        status=SessionStatus.CONFIGURING,
        baseline_scores={"overall": 0.62},
        final_scores={"overall": 0.62},
    )
    db.add(session)
    commit_with_rollback(db, "create training session")
    db.refresh(session)
    return session


@router.get("/{session_id}", response_model=TrainingSessionRead)
def get_session(session_id: str, db: Session = Depends(get_db)) -> TrainingSession:
    """Fetch a single training session by identifier."""

    session = db.get(TrainingSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/{session_id}/configure")
def configure_session(session_id: str, payload: WizardConfigRequest, db: Session = Depends(get_db)) -> dict:
    """Apply config wizard choices and generate strategy markdown."""

    session = db.get(TrainingSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.allowed_levels = payload.optimization_scope
    session.config = {
        **(session.config or {}),
        "category_weights": payload.category_weights,
        "enabled_eval_case_ids": payload.enabled_eval_case_ids,
    }

    diagnostic = {
        "opportunities": [
            {
                "title": "Orchestrator misroutes billing disputes to RefundAgent",
                "level": "L3",
                "target_agent": "CustomerSupportOrchestrator",
                "impact": 8,
                "priority": "critical",
                "root_cause": "Specialist descriptions overlap on billing/refund terms",
            },
            {
                "title": "RefundAgent skips eligibility verification",
                "level": "L1",
                "target_agent": "RefundAgent",
                "impact": 6,
                "priority": "high",
                "root_cause": "Instruction does not force ordered policy checks",
            },
        ]
    }

    session.strategy_md = StrategyGenerator().generate(diagnostic, payload.optimization_scope)
    db.add(session)
    commit_with_rollback(db, "configure training session")
    db.refresh(session)

    return {
        "session_id": session_id,
        "strategy_md": session.strategy_md,
        "allowed_levels": session.allowed_levels,
    }


@router.post("/{session_id}/start")
async def start_session(session_id: str, db: Session = Depends(get_db)) -> dict:
    """Move a session to running and push a live update event."""

    session = db.get(TrainingSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = SessionStatus.RUNNING
    session.started_at = datetime.utcnow()
    db.add(session)
    commit_with_rollback(db, "start training session")
    db.refresh(session)

    await live_manager.broadcast(
        {
            "type": "session_started",
            "session_id": session_id,
            "timestamp": session.started_at.isoformat(),
        }
    )

    return {"status": "running", "session_id": session_id}


@router.get("/{session_id}/research-memory")
def get_research_memory(session_id: str, db: Session = Depends(get_db)) -> list[dict]:
    """Return research memory entries for a session."""

    entries = db.query(ResearchMemory).filter(ResearchMemory.session_id == session_id).order_by(ResearchMemory.created_at.asc()).all()
    return [
        {
            "id": e.id,
            "session_id": e.session_id,
            "experiment_id": e.experiment_id,
            "target_agent_id": e.target_agent_id,
            "level": e.level,
            "insight": e.insight,
            "reusable_pattern": e.reusable_pattern,
            "anti_pattern": e.anti_pattern,
            "transferable_to": e.transferable_to,
            "tags": e.tags,
            "created_at": e.created_at.isoformat() if e.created_at else "",
        }
        for e in entries
    ]


@router.get("/{session_id}/briefing", response_model=BriefingResponse)
def get_briefing(session_id: str, db: Session = Depends(get_db)) -> BriefingResponse:
    """Generate a morning briefing payload for a completed session."""

    session = db.get(TrainingSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    experiments = [
        {
            "id": exp.id,
            "wave_number": exp.wave_number,
            "title": exp.hypothesis_title,
            "impact_points": exp.impact_points,
            "optimization_level": exp.optimization_level,
            "target_agent": exp.target_agent_id,
        }
        for exp in db.query(Experiment).filter(Experiment.session_id == session_id).all()
    ]

    payload = BriefingGenerator().build(
        session_id=session_id,
        score_before=session.baseline_scores.get("overall", 0.0),
        score_after=session.final_scores.get("overall", 0.0),
        experiments=experiments,
        per_agent_deltas=session.final_scores.get("per_agent_deltas", []),
        routing_before_after=session.final_scores.get("routing_before_after", {}),
        shared_agent_validation=session.final_scores.get("shared_validation", []),
    )
    return BriefingResponse(**payload)
