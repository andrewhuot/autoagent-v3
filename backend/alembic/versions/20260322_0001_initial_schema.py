"""Initial AutoAgent schema."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260322_0001"
down_revision = None
branch_labels = None
depends_on = None

source_type_enum = sa.Enum("adk_python", "agent_studio", "git_repo", name="source_type")
agent_type_enum = sa.Enum("llm_agent", "sequential", "parallel", "loop", "custom", name="agent_type")
agent_role_enum = sa.Enum("orchestrator", "specialist", "workflow", "shared", name="agent_role")
eval_level_enum = sa.Enum("specialist_unit", "routing", "end_to_end", "cross_tree", name="eval_level")
eval_source_enum = sa.Enum("auto_generated", "manual", "production", name="eval_source")
session_status_enum = sa.Enum("configuring", "running", "completed", "stopped", name="session_status")
experiment_status_enum = sa.Enum("running", "kept", "reverted", "synthesis", name="experiment_status")
deployment_scope_enum = sa.Enum("full_tree", "single_agent", "library_agent", name="deployment_scope")
deployment_mode_enum = sa.Enum("replace", "canary", name="deployment_mode")
deployment_status_enum = sa.Enum("deploying", "active", "promoted", "rolled_back", name="deployment_status")


def upgrade() -> None:
    op.create_table(
        "agent_trees",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("source_type", source_type_enum, nullable=False),
        sa.Column("source_ref", sa.Text(), nullable=False),
        sa.Column("tree_profile", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "agents",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("tree_id", sa.String(length=36), sa.ForeignKey("agent_trees.id"), nullable=True),
        sa.Column("library_id", sa.String(length=100), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("agent_type", agent_type_enum, nullable=False),
        sa.Column("role", agent_role_enum, nullable=False),
        sa.Column("parent_agent_id", sa.String(length=36), sa.ForeignKey("agents.id"), nullable=True),
        sa.Column("instruction", sa.Text(), nullable=False, server_default=""),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("model", sa.String(length=100), nullable=False, server_default="gemini-2.5-flash"),
        sa.Column("tools", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("config_snapshot", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "agent_library_consumers",
        sa.Column("library_agent_id", sa.String(length=36), sa.ForeignKey("agents.id"), primary_key=True),
        sa.Column("consumer_tree_id", sa.String(length=36), sa.ForeignKey("agent_trees.id"), primary_key=True),
        sa.Column("integration_point", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "eval_suites",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("tree_id", sa.String(length=36), sa.ForeignKey("agent_trees.id"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category_weights", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("safety_floor", sa.Float(), nullable=False, server_default="0.9"),
        sa.Column("routing_floor", sa.Float(), nullable=False, server_default="0.7"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "eval_cases",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("suite_id", sa.String(length=36), sa.ForeignKey("eval_suites.id"), nullable=False),
        sa.Column("level", eval_level_enum, nullable=False),
        sa.Column("target_agent_id", sa.String(length=36), sa.ForeignKey("agents.id"), nullable=True),
        sa.Column("category", sa.String(length=50), nullable=False, server_default="general"),
        sa.Column("source", eval_source_enum, nullable=False, server_default="auto_generated"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.sql.expression.true()),
        sa.Column("scenario_json", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("expected_agent_sequence", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("expected_trajectory", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("expected_response", sa.Text(), nullable=False, server_default=""),
        sa.Column("mock_tool_outputs", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "training_sessions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("tree_id", sa.String(length=36), sa.ForeignKey("agent_trees.id"), nullable=False),
        sa.Column("eval_suite_id", sa.String(length=36), sa.ForeignKey("eval_suites.id"), nullable=False),
        sa.Column("strategy_md", sa.Text(), nullable=False, server_default=""),
        sa.Column("allowed_levels", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("config", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("status", session_status_enum, nullable=False, server_default="configuring"),
        sa.Column("baseline_scores", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("final_scores", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("total_experiments", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "experiments",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("session_id", sa.String(length=36), sa.ForeignKey("training_sessions.id"), nullable=False),
        sa.Column("wave_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("branch_id", sa.String(length=1), nullable=False, server_default="A"),
        sa.Column("parent_id", sa.String(length=36), sa.ForeignKey("experiments.id"), nullable=True),
        sa.Column("target_agent_id", sa.String(length=36), sa.ForeignKey("agents.id"), nullable=True),
        sa.Column("optimization_level", sa.String(length=2), nullable=False, server_default="L1"),
        sa.Column("blast_radius", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("hypothesis_title", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("hypothesis_rationale", sa.Text(), nullable=False, server_default=""),
        sa.Column("config_diff", sa.Text(), nullable=False, server_default=""),
        sa.Column("per_agent_config_diffs", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("status", experiment_status_enum, nullable=False, server_default="running"),
        sa.Column("scores", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("per_agent_scores", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("routing_accuracy", sa.Float(), nullable=False, server_default="0"),
        sa.Column("cross_tree_results", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("eval_scope_used", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("impact_points", sa.Float(), nullable=False, server_default="0"),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("tokens_used", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duration_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "research_memory",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("session_id", sa.String(length=36), sa.ForeignKey("training_sessions.id"), nullable=False),
        sa.Column("experiment_id", sa.String(length=36), sa.ForeignKey("experiments.id"), nullable=False),
        sa.Column("target_agent_id", sa.String(length=36), sa.ForeignKey("agents.id"), nullable=True),
        sa.Column("level", sa.String(length=2), nullable=False, server_default="L1"),
        sa.Column("insight", sa.Text(), nullable=False, server_default=""),
        sa.Column("reusable_pattern", sa.Text(), nullable=False, server_default=""),
        sa.Column("anti_pattern", sa.Text(), nullable=False, server_default=""),
        sa.Column("transferable_to", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("tags", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "deployments",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("session_id", sa.String(length=36), sa.ForeignKey("training_sessions.id"), nullable=False),
        sa.Column("scope", deployment_scope_enum, nullable=False, server_default="full_tree"),
        sa.Column("target_agent_ids", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("mode", deployment_mode_enum, nullable=False, server_default="replace"),
        sa.Column("canary_percentage", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", deployment_status_enum, nullable=False, server_default="deploying"),
        sa.Column("rollback_configs", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("cross_tree_health_checks", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("deployed_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("deployments")
    op.drop_table("research_memory")
    op.drop_table("experiments")
    op.drop_table("training_sessions")
    op.drop_table("eval_cases")
    op.drop_table("eval_suites")
    op.drop_table("agent_library_consumers")
    op.drop_table("agents")
    op.drop_table("agent_trees")

    deployment_status_enum.drop(op.get_bind(), checkfirst=True)
    deployment_mode_enum.drop(op.get_bind(), checkfirst=True)
    deployment_scope_enum.drop(op.get_bind(), checkfirst=True)
    experiment_status_enum.drop(op.get_bind(), checkfirst=True)
    session_status_enum.drop(op.get_bind(), checkfirst=True)
    eval_source_enum.drop(op.get_bind(), checkfirst=True)
    eval_level_enum.drop(op.get_bind(), checkfirst=True)
    agent_role_enum.drop(op.get_bind(), checkfirst=True)
    agent_type_enum.drop(op.get_bind(), checkfirst=True)
    source_type_enum.drop(op.get_bind(), checkfirst=True)
