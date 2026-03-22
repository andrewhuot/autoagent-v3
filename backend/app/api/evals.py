"""Eval suite and eval case management endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.error_handling import commit_with_rollback, parse_enum_value
from app.engine import MultiLevelEvalGenerator
from app.models.entities import AgentTree, EvalCase, EvalSuite
from app.models.enums import EvalLevel, EvalSource
from app.schemas.domain import EvalCaseCreate, EvalCaseRead, EvalSuiteCreate, EvalSuiteRead

router = APIRouter(prefix="/evals", tags=["evals"])


@router.get("/suites", response_model=list[EvalSuiteRead])
def list_suites(tree_id: str | None = None, db: Session = Depends(get_db)) -> list[EvalSuite]:
    """List eval suites, optionally filtered by tree."""

    query = db.query(EvalSuite)
    if tree_id:
        query = query.filter(EvalSuite.tree_id == tree_id)
    return query.order_by(EvalSuite.created_at.desc()).all()


@router.post("/suites", response_model=EvalSuiteRead)
def create_suite(payload: EvalSuiteCreate, db: Session = Depends(get_db)) -> EvalSuite:
    """Create an eval suite for a tree."""

    if not db.get(AgentTree, payload.tree_id):
        raise HTTPException(status_code=404, detail="Tree not found")

    suite = EvalSuite(
        tree_id=payload.tree_id,
        name=payload.name,
        category_weights=payload.category_weights,
        safety_floor=payload.safety_floor,
        routing_floor=payload.routing_floor,
    )
    db.add(suite)
    commit_with_rollback(db, "create eval suite")
    db.refresh(suite)
    return suite


@router.post("/cases", response_model=EvalCaseRead)
def create_case(payload: EvalCaseCreate, db: Session = Depends(get_db)) -> EvalCase:
    """Create an eval case under a suite."""

    if not db.get(EvalSuite, payload.suite_id):
        raise HTTPException(status_code=404, detail="Eval suite not found")

    level = parse_enum_value(payload.level, EvalLevel, "level")
    source = parse_enum_value(payload.source, EvalSource, "source")

    case = EvalCase(
        suite_id=payload.suite_id,
        level=level,
        target_agent_id=payload.target_agent_id,
        category=payload.category,
        source=source,
        enabled=payload.enabled,
        scenario_json=payload.scenario_json,
        expected_agent_sequence=payload.expected_agent_sequence,
        expected_trajectory=payload.expected_trajectory,
        expected_response=payload.expected_response,
        mock_tool_outputs=payload.mock_tool_outputs,
    )
    db.add(case)
    commit_with_rollback(db, "create eval case")
    db.refresh(case)
    return case


@router.get("/cases", response_model=list[EvalCaseRead])
def list_cases(suite_id: str, db: Session = Depends(get_db)) -> list[EvalCase]:
    """List eval cases for a given suite."""

    return db.query(EvalCase).filter(EvalCase.suite_id == suite_id).all()


@router.post("/generate/{tree_id}")
def generate_from_tree(tree_id: str, db: Session = Depends(get_db)) -> dict:
    """Generate draft eval cases from a tree profile."""

    tree = db.get(AgentTree, tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")

    return MultiLevelEvalGenerator().generate(tree.tree_profile)
