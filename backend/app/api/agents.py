"""Agent CRUD and tree relationship endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.error_handling import commit_with_rollback, parse_enum_value
from app.models.entities import Agent, AgentTree
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

    if payload.tree_id and not db.get(AgentTree, payload.tree_id):
        raise HTTPException(status_code=404, detail="Tree not found")
    if payload.parent_agent_id and not db.get(Agent, payload.parent_agent_id):
        raise HTTPException(status_code=404, detail="Parent agent not found")

    agent_type = parse_enum_value(payload.agent_type, AgentType, "agent_type")
    role = parse_enum_value(payload.role, AgentRole, "role")

    agent = Agent(
        tree_id=payload.tree_id,
        library_id=payload.library_id,
        name=payload.name,
        agent_type=agent_type,
        role=role,
        parent_agent_id=payload.parent_agent_id,
        instruction=payload.instruction,
        description=payload.description,
        model=payload.model,
        tools=payload.tools,
        config_snapshot=payload.config_snapshot,
    )
    db.add(agent)
    commit_with_rollback(db, "create agent")
    db.refresh(agent)
    return agent


@router.get("/{agent_id}", response_model=AgentRead)
def get_agent(agent_id: str, db: Session = Depends(get_db)) -> Agent:
    """Get a single agent definition."""

    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent
