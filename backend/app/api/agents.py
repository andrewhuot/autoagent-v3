"""Agent CRUD and tree relationship endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.entities import Agent
from app.models.enums import AgentRole, AgentType
from app.schemas.domain import AgentCreate, AgentRead

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("/", response_model=list[AgentRead])
def list_agents(tree_id: str | None = None, db: Session = Depends(get_db)) -> list[Agent]:
    """List all agents, optionally filtered by tree."""

    query = db.query(Agent)
    if tree_id:
        query = query.filter(Agent.tree_id == tree_id)
    return query.order_by(Agent.created_at.asc()).all()


@router.post("/", response_model=AgentRead)
def create_agent(payload: AgentCreate, db: Session = Depends(get_db)) -> Agent:
    """Create a new agent in a tree or the shared library."""

    agent = Agent(
        tree_id=payload.tree_id,
        library_id=payload.library_id,
        name=payload.name,
        agent_type=AgentType(payload.agent_type),
        role=AgentRole(payload.role),
        parent_agent_id=payload.parent_agent_id,
        instruction=payload.instruction,
        description=payload.description,
        model=payload.model,
        tools=payload.tools,
        config_snapshot=payload.config_snapshot,
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


@router.get("/{agent_id}", response_model=AgentRead)
def get_agent(agent_id: str, db: Session = Depends(get_db)) -> Agent:
    """Get a single agent definition."""

    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent
