"""Shared agent library registry and validation endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.error_handling import commit_with_rollback
from app.engine import CrossTreeValidator
from app.models.entities import Agent, AgentLibraryConsumer, AgentTree
from app.models.enums import AgentRole
from app.schemas.domain import AgentLibraryConsumerCreate, AgentLibraryConsumerRead, AgentRead

router = APIRouter(prefix="/library", tags=["library"])


@router.get("/agents", response_model=list[AgentRead])
def list_shared_agents(db: Session = Depends(get_db)) -> list[Agent]:
    """List all shared/library agents."""

    return db.query(Agent).filter(Agent.role == AgentRole.SHARED).all()


@router.get("/consumers", response_model=list[AgentLibraryConsumerRead])
def list_consumers(db: Session = Depends(get_db)) -> list[AgentLibraryConsumer]:
    """Return all shared-agent consumer links."""

    return db.query(AgentLibraryConsumer).all()


@router.post("/consumers", response_model=AgentLibraryConsumerRead)
def add_consumer(payload: AgentLibraryConsumerCreate, db: Session = Depends(get_db)) -> AgentLibraryConsumer:
    """Register a tree as a consumer of a shared agent."""

    library_agent = db.get(Agent, payload.library_agent_id)
    if not library_agent:
        raise HTTPException(status_code=404, detail="Library agent not found")
    if library_agent.role != AgentRole.SHARED:
        raise HTTPException(status_code=400, detail="library_agent_id must reference a shared agent")
    if not db.get(AgentTree, payload.consumer_tree_id):
        raise HTTPException(status_code=404, detail="Consumer tree not found")

    link = AgentLibraryConsumer(
        library_agent_id=payload.library_agent_id,
        consumer_tree_id=payload.consumer_tree_id,
        integration_point=payload.integration_point,
    )
    db.add(link)
    commit_with_rollback(db, "add library consumer")
    db.refresh(link)
    return link


@router.post("/validate/{library_agent_id}")
def validate_shared_change(library_agent_id: str, payload: dict) -> dict:
    """Validate a shared-agent change across consuming trees."""

    baseline = payload.get("baseline_by_tree") or {}
    candidate = payload.get("candidate_by_tree") or {}

    if not baseline:
        raise HTTPException(status_code=400, detail="baseline_by_tree is required")

    result = CrossTreeValidator().validate(baseline_by_tree=baseline, candidate_by_tree=candidate)
    return {
        "library_agent_id": library_agent_id,
        **result,
    }
