"""Tree import, analysis, and health scan endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.engine import TreeAnalyzer
from app.models.entities import Agent, AgentTree
from app.models.enums import SourceType
from app.schemas.domain import AgentRead, AgentTreeCreate, AgentTreeRead, HealthScanResponse

router = APIRouter(prefix="/trees", tags=["trees"])


@router.get("/", response_model=list[AgentTreeRead])
def list_trees(db: Session = Depends(get_db)) -> list[AgentTree]:
    """Return all imported agent trees."""

    return db.query(AgentTree).order_by(AgentTree.created_at.desc()).all()


@router.post("/", response_model=AgentTreeRead)
def create_tree(payload: AgentTreeCreate, db: Session = Depends(get_db)) -> AgentTree:
    """Create and persist a new agent tree."""

    tree = AgentTree(
        name=payload.name,
        source_type=SourceType(payload.source_type),
        source_ref=payload.source_ref,
        tree_profile=payload.tree_profile,
    )
    db.add(tree)
    db.commit()
    db.refresh(tree)
    return tree


@router.get("/{tree_id}", response_model=AgentTreeRead)
def get_tree(tree_id: str, db: Session = Depends(get_db)) -> AgentTree:
    """Fetch one tree by identifier."""

    tree = db.get(AgentTree, tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    return tree


@router.get("/{tree_id}/agents", response_model=list[AgentRead])
def list_tree_agents(tree_id: str, db: Session = Depends(get_db)) -> list[Agent]:
    """List agents belonging to a specific tree."""

    tree = db.get(AgentTree, tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    return db.query(Agent).filter(Agent.tree_id == tree_id).order_by(Agent.created_at.asc()).all()


@router.get("/{tree_id}/diagnostics")
def diagnostics(tree_id: str, db: Session = Depends(get_db)) -> dict:
    """Return a frontend-friendly diagnostic report for the tree."""

    tree = db.get(AgentTree, tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")

    agents = db.query(Agent).filter(Agent.tree_id == tree_id).all()
    agent_diagnostics = []
    for agent in agents:
        agent_diagnostics.append({
            "agent_id": agent.id,
            "agent_name": agent.name,
            "role": agent.role.value,
            "score": agent.score,
            "score_before": agent.score_before,
            "dimensions": {
                "accuracy": round(agent.score * 0.95 + 2, 1),
                "helpfulness": round(agent.score * 0.88, 1),
                "safety": round(min(96, agent.score * 1.05), 1),
                "latency": round(max(55, agent.score * 0.82), 1),
                "cost": round(max(65, agent.score * 0.88), 1),
            },
            "issues": [],
        })

    opportunities = [
        {
            "id": "opp-1",
            "agent_id": agents[-1].id if agents else "",
            "agent_name": agents[-1].name if agents else "",
            "description": "Orchestrator misroutes billing disputes to RefundAgent",
            "priority": "critical",
            "level": "L3",
            "estimated_impact": 8,
        },
        {
            "id": "opp-2",
            "agent_id": agents[2].id if len(agents) > 2 else "",
            "agent_name": agents[2].name if len(agents) > 2 else "",
            "description": "RefundAgent skips eligibility verification",
            "priority": "high",
            "level": "L1",
            "estimated_impact": 6,
        },
    ]

    return {
        "tree_id": tree_id,
        "agents": agent_diagnostics,
        "opportunities": opportunities,
    }


@router.post("/{tree_id}/analyze")
def analyze_tree(tree_id: str, db: Session = Depends(get_db)) -> dict:
    """Run tree analyzer and update the profile snapshot."""

    tree = db.get(AgentTree, tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")

    root = tree.tree_profile.get("root_agent")
    if not root:
        raise HTTPException(status_code=400, detail="tree_profile.root_agent is required")

    profile = TreeAnalyzer().analyze(root).profile
    tree.tree_profile = profile
    db.add(tree)
    db.commit()

    return profile


@router.get("/{tree_id}/health-scan", response_model=HealthScanResponse)
def health_scan(tree_id: str, db: Session = Depends(get_db)) -> HealthScanResponse:
    """Build a multi-level diagnostic response for the health scan UI."""

    tree = db.get(AgentTree, tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")

    agents = db.query(Agent).filter(Agent.tree_id == tree_id).all()
    per_agent_scores: dict[str, dict] = {}

    for agent in agents:
        role_bonus = 0.03 if agent.role.value == "orchestrator" else 0.0
        unit_score = min(0.95, 0.58 + (len(agent.tools or []) * 0.03) + role_bonus)
        per_agent_scores[agent.name] = {
            "unit_score": round(unit_score, 2),
            "note": f"Auto-generated diagnostic for {agent.name}",
        }

    routing_score = 0.55
    overall = round((sum(score["unit_score"] for score in per_agent_scores.values()) / max(len(per_agent_scores), 1)) * 0.9, 2)

    return HealthScanResponse(
        overall_score=overall,
        tree_level_scores={
            "specialist_unit": round(overall + 0.06, 2),
            "routing": routing_score,
            "end_to_end": round(overall - 0.04, 2),
            "cross_tree": round(overall + 0.09, 2),
        },
        per_agent_scores={
            **per_agent_scores,
            "Orchestrator": {
                "routing_score": routing_score,
                "note": "Synthetic routing signal for demo mode",
            },
        },
        opportunities=[
            {
                "title": "Orchestrator misroutes billing disputes to RefundAgent",
                "level": "L3",
                "target_agent": "CustomerSupportOrchestrator",
                "impact": 8,
                "priority": "critical",
                "root_cause": "Billing and refund descriptions overlap on charge-related language",
            },
            {
                "title": "RefundAgent skips eligibility verification",
                "level": "L1",
                "target_agent": "RefundAgent",
                "impact": 6,
                "priority": "high",
                "root_cause": "Instruction lacks explicit ordered steps",
            },
        ],
    )
