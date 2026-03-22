"""Experiment management and proposer endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.engine import MultiAgentProposer, ParetoScorer, ScopedEvalRunner
from app.models.entities import Experiment, TrainingSession
from app.models.enums import ExperimentStatus
from app.schemas.domain import ExperimentCreate, ExperimentRead

router = APIRouter(prefix="/experiments", tags=["experiments"])


@router.get("/", response_model=list[ExperimentRead])
def list_experiments(session_id: str | None = None, db: Session = Depends(get_db)) -> list[Experiment]:
    """List experiments, optionally scoped to one session."""

    query = db.query(Experiment)
    if session_id:
        query = query.filter(Experiment.session_id == session_id)
    return query.order_by(Experiment.created_at.asc()).all()


@router.get("/{experiment_id}", response_model=ExperimentRead)
def get_experiment(experiment_id: str, db: Session = Depends(get_db)) -> Experiment:
    """Fetch a single experiment by identifier."""

    experiment = db.get(Experiment, experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return experiment


@router.post("/", response_model=ExperimentRead)
def create_experiment(payload: ExperimentCreate, db: Session = Depends(get_db)) -> Experiment:
    """Persist a new experiment branch result."""

    score_card = ParetoScorer().score(
        {
            "trajectory": payload.scores.get("trajectory", 0.75),
            "response": payload.scores.get("response", 0.74),
            "task_completion": payload.scores.get("task_completion", 0.72),
            "safety": payload.scores.get("safety", 0.93),
            "efficiency": payload.scores.get("efficiency", 0.69),
            "routing_accuracy": payload.routing_accuracy or 0.78,
        }
    )

    status = ExperimentStatus.KEPT if score_card["constraints_ok"] else ExperimentStatus.REVERTED

    experiment = Experiment(
        session_id=payload.session_id,
        wave_number=payload.wave_number,
        branch_id=payload.branch_id,
        parent_id=payload.parent_id,
        target_agent_id=payload.target_agent_id,
        optimization_level=payload.optimization_level,
        blast_radius=payload.blast_radius,
        hypothesis_title=payload.hypothesis_title,
        hypothesis_rationale=payload.hypothesis_rationale,
        config_diff=payload.config_diff,
        per_agent_config_diffs=payload.per_agent_config_diffs,
        status=status,
        scores={**payload.scores, "composite": score_card["composite"]},
        per_agent_scores=payload.per_agent_scores,
        routing_accuracy=payload.routing_accuracy,
        cross_tree_results=payload.cross_tree_results,
        eval_scope_used=payload.eval_scope_used,
        impact_points=score_card["impact_points"],
        summary=payload.summary,
        tokens_used=payload.tokens_used,
        duration_ms=payload.duration_ms,
    )
    db.add(experiment)
    db.commit()
    db.refresh(experiment)
    return experiment


@router.post("/propose/{session_id}")
def propose_wave(session_id: str, branch_count: int = 3, db: Session = Depends(get_db)) -> dict:
    """Generate a new wave of hypotheses from session context."""

    session = db.get(TrainingSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    diagnostic = {
        "opportunities": [
            {
                "title": "Differentiate BillingAgent and RefundAgent routing descriptions",
                "level": "L3",
                "target_agent": "CustomerSupportOrchestrator",
                "impact": 8,
                "priority": "critical",
                "root_cause": "Descriptions overlap on charge/payment language",
            },
            {
                "title": "Add explicit refund decision tree",
                "level": "L1",
                "target_agent": "RefundAgent",
                "impact": 6,
                "priority": "high",
                "root_cause": "Step ordering is underspecified",
            },
            {
                "title": "Add billing dispute scenarios",
                "level": "L1",
                "target_agent": "BillingAgent",
                "impact": 5,
                "priority": "medium",
                "root_cause": "Missing edge-case examples",
            },
        ]
    }

    return MultiAgentProposer().propose(diagnostic, allowed_levels=session.allowed_levels, branch_count=branch_count)


@router.post("/simulate-scope")
def simulate_scoped_eval(level: str, base_score: float = 0.62, lift: float = 0.04) -> dict:
    """Return demo scoped-eval output for a proposed branch."""

    return ScopedEvalRunner().run(base_score=base_score, lift=lift, level=level)
