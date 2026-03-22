"""Deployment orchestration endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.error_handling import commit_with_rollback, parse_enum_value
from app.models.entities import Deployment, TrainingSession
from app.models.enums import DeploymentMode, DeploymentScope, DeploymentStatus
from app.schemas.domain import DeploymentCreate, DeploymentRead

from fastapi import HTTPException

router = APIRouter(prefix="/deploy", tags=["deploy"])


@router.get("/", response_model=list[DeploymentRead])
def list_deployments(session_id: str | None = None, db: Session = Depends(get_db)) -> list[Deployment]:
    """List deployment records."""

    query = db.query(Deployment)
    if session_id:
        query = query.filter(Deployment.session_id == session_id)
    return query.order_by(Deployment.deployed_at.desc()).all()


@router.get("/{deployment_id}", response_model=DeploymentRead)
def get_deployment(deployment_id: str, db: Session = Depends(get_db)) -> Deployment:
    """Fetch a single deployment by identifier."""

    deployment = db.get(Deployment, deployment_id)
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return deployment


@router.post("/", response_model=DeploymentRead)
def create_deployment(payload: DeploymentCreate, db: Session = Depends(get_db)) -> Deployment:
    """Create a deployment event for tree or per-agent rollout."""

    if not db.get(TrainingSession, payload.session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    if payload.canary_percentage < 0 or payload.canary_percentage > 100:
        raise HTTPException(status_code=400, detail="canary_percentage must be between 0 and 100")

    scope = parse_enum_value(payload.scope, DeploymentScope, "scope")
    mode = parse_enum_value(payload.mode, DeploymentMode, "mode")
    status = parse_enum_value(payload.status, DeploymentStatus, "status")

    deployment = Deployment(
        session_id=payload.session_id,
        scope=scope,
        target_agent_ids=payload.target_agent_ids,
        mode=mode,
        canary_percentage=payload.canary_percentage,
        status=status,
        rollback_configs=payload.rollback_configs,
        cross_tree_health_checks=payload.cross_tree_health_checks,
    )
    db.add(deployment)
    commit_with_rollback(db, "create deployment")
    db.refresh(deployment)
    return deployment
