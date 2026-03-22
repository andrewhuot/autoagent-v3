"""Model schema tests for required tables."""

from __future__ import annotations

from sqlalchemy import inspect

from app.models.base import Base


REQUIRED_TABLES = {
    "agent_trees",
    "agents",
    "agent_library_consumers",
    "eval_suites",
    "eval_cases",
    "training_sessions",
    "experiments",
    "research_memory",
    "deployments",
}


def test_all_required_tables_exist(db_session) -> None:
    """Section 4 tables should all exist in metadata and database."""

    metadata_tables = set(Base.metadata.tables.keys())
    assert REQUIRED_TABLES.issubset(metadata_tables)

    inspector = inspect(db_session.get_bind())
    db_tables = set(inspector.get_table_names())
    assert REQUIRED_TABLES.issubset(db_tables)
