"""Seed data verification tests."""

from __future__ import annotations

from app.models.entities import Agent, AgentTree, EvalCase, EvalSuite, TrainingSession
from app.seed import seed_database


def test_seed_creates_customer_support_sample(db_session) -> None:
    """Seed script should create tree, agents, eval suite/cases, and one session."""

    result = seed_database(db_session)
    assert result["seeded"] is True

    tree = db_session.query(AgentTree).filter(AgentTree.name == "Customer Support").one()
    assert tree.tree_profile["total_agents"] == 8

    agent_count = db_session.query(Agent).filter(Agent.tree_id == tree.id).count()
    assert agent_count == 8

    suite_count = db_session.query(EvalSuite).filter(EvalSuite.tree_id == tree.id).count()
    assert suite_count == 1

    case_count = db_session.query(EvalCase).count()
    assert case_count >= 4

    session_count = db_session.query(TrainingSession).filter(TrainingSession.tree_id == tree.id).count()
    assert session_count == 1
