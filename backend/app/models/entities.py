"""ORM entity models representing AutoAgent's domain schema."""

from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy import JSON as JSONType
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import (
    AgentRole,
    AgentType,
    DeploymentMode,
    DeploymentScope,
    DeploymentStatus,
    EvalLevel,
    EvalSource,
    ExperimentStatus,
    SessionStatus,
    SourceType,
)


def _uuid() -> str:
    return str(uuid4())


class AgentTree(Base):
    """A multi-agent hierarchy imported into AutoAgent."""

    __tablename__ = "agent_trees"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    owner: Mapped[str] = mapped_column(String(255), default="")
    source_type: Mapped[SourceType] = mapped_column(Enum(SourceType), nullable=False)
    source_ref: Mapped[str] = mapped_column(Text, nullable=False)
    tree_profile: Mapped[dict] = mapped_column(JSONType, default=dict)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    score_before: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(50), default="idle")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    agents: Mapped[list[Agent]] = relationship("Agent", back_populates="tree", cascade="all, delete-orphan", lazy="selectin")

    @property
    def agent_count(self) -> int:
        """Number of agents in this tree."""
        return len(self.agents) if self.agents else 0
    eval_suites: Mapped[list[EvalSuite]] = relationship("EvalSuite", back_populates="tree", cascade="all, delete-orphan")
    sessions: Mapped[list[TrainingSession]] = relationship("TrainingSession", back_populates="tree", cascade="all, delete-orphan")


class Agent(Base):
    """An agent definition in a tree or shared agent library."""

    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tree_id: Mapped[str | None] = mapped_column(ForeignKey("agent_trees.id"), nullable=True)
    library_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    agent_type: Mapped[AgentType] = mapped_column(Enum(AgentType), nullable=False)
    role: Mapped[AgentRole] = mapped_column(Enum(AgentRole), nullable=False)
    parent_agent_id: Mapped[str | None] = mapped_column(ForeignKey("agents.id"), nullable=True)
    instruction: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    model: Mapped[str] = mapped_column(String(100), default="gemini-2.5-flash")
    tools: Mapped[list] = mapped_column(JSONType, default=list)
    config_snapshot: Mapped[str] = mapped_column(Text, default="")
    score: Mapped[float] = mapped_column(Float, default=0.0)
    score_before: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tree: Mapped[AgentTree | None] = relationship("AgentTree", back_populates="agents")
    parent: Mapped[Agent | None] = relationship("Agent", remote_side=[id], back_populates="children")
    children: Mapped[list[Agent]] = relationship("Agent", back_populates="parent")


class AgentLibraryConsumer(Base):
    """Links shared library agents to the trees that consume them."""

    __tablename__ = "agent_library_consumers"

    library_agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id"), primary_key=True)
    consumer_tree_id: Mapped[str] = mapped_column(ForeignKey("agent_trees.id"), primary_key=True)
    integration_point: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EvalSuite(Base):
    """A collection of eval cases for one agent tree."""

    __tablename__ = "eval_suites"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tree_id: Mapped[str] = mapped_column(ForeignKey("agent_trees.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category_weights: Mapped[dict] = mapped_column(JSONType, default=dict)
    safety_floor: Mapped[float] = mapped_column(Float, default=0.9)
    routing_floor: Mapped[float] = mapped_column(Float, default=0.7)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tree: Mapped[AgentTree] = relationship("AgentTree", back_populates="eval_suites")
    cases: Mapped[list[EvalCase]] = relationship("EvalCase", back_populates="suite", cascade="all, delete-orphan")


class EvalCase(Base):
    """A single specialist, routing, end-to-end, or cross-tree eval case."""

    __tablename__ = "eval_cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    suite_id: Mapped[str] = mapped_column(ForeignKey("eval_suites.id"), nullable=False)
    level: Mapped[EvalLevel] = mapped_column(Enum(EvalLevel), nullable=False)
    target_agent_id: Mapped[str | None] = mapped_column(ForeignKey("agents.id"), nullable=True)
    category: Mapped[str] = mapped_column(String(50), default="general")
    source: Mapped[EvalSource] = mapped_column(Enum(EvalSource), default=EvalSource.AUTO_GENERATED)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    scenario_json: Mapped[dict] = mapped_column(JSONType, default=dict)
    expected_agent_sequence: Mapped[list] = mapped_column(JSONType, default=list)
    expected_trajectory: Mapped[list] = mapped_column(JSONType, default=list)
    expected_response: Mapped[str] = mapped_column(Text, default="")
    mock_tool_outputs: Mapped[dict] = mapped_column(JSONType, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    suite: Mapped[EvalSuite] = relationship("EvalSuite", back_populates="cases")


class TrainingSession(Base):
    """A training run that optimizes an agent tree over many experiments."""

    __tablename__ = "training_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tree_id: Mapped[str] = mapped_column(ForeignKey("agent_trees.id"), nullable=False)
    eval_suite_id: Mapped[str] = mapped_column(ForeignKey("eval_suites.id"), nullable=False)
    strategy_md: Mapped[str] = mapped_column(Text, default="")
    allowed_levels: Mapped[list[str]] = mapped_column(JSONType, default=list)
    config: Mapped[dict] = mapped_column(JSONType, default=dict)
    status: Mapped[SessionStatus] = mapped_column(Enum(SessionStatus), default=SessionStatus.CONFIGURING)
    baseline_scores: Mapped[dict] = mapped_column(JSONType, default=dict)
    final_scores: Mapped[dict] = mapped_column(JSONType, default=dict)
    total_experiments: Mapped[int] = mapped_column(Integer, default=0)
    total_waves: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    tree: Mapped[AgentTree] = relationship("AgentTree", back_populates="sessions")
    experiments: Mapped[list[Experiment]] = relationship("Experiment", back_populates="session", cascade="all, delete-orphan")


class Experiment(Base):
    """A single branch hypothesis execution and scoring result."""

    __tablename__ = "experiments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("training_sessions.id"), nullable=False)
    wave_number: Mapped[int] = mapped_column(Integer, default=1)
    branch_id: Mapped[str] = mapped_column(String(1), default="A")
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("experiments.id"), nullable=True)
    target_agent_id: Mapped[str | None] = mapped_column(ForeignKey("agents.id"), nullable=True)
    optimization_level: Mapped[str] = mapped_column(String(2), default="L1")
    blast_radius: Mapped[list[str]] = mapped_column(JSONType, default=list)
    hypothesis_title: Mapped[str] = mapped_column(String(500), default="")
    hypothesis_rationale: Mapped[str] = mapped_column(Text, default="")
    config_diff: Mapped[str] = mapped_column(Text, default="")
    per_agent_config_diffs: Mapped[dict] = mapped_column(JSONType, default=dict)
    status: Mapped[ExperimentStatus] = mapped_column(Enum(ExperimentStatus), default=ExperimentStatus.RUNNING)
    scores: Mapped[dict] = mapped_column(JSONType, default=dict)
    per_agent_scores: Mapped[dict] = mapped_column(JSONType, default=dict)
    routing_accuracy: Mapped[float] = mapped_column(Float, default=0)
    cross_tree_results: Mapped[dict] = mapped_column(JSONType, default=dict)
    eval_scope_used: Mapped[dict] = mapped_column(JSONType, default=dict)
    impact_points: Mapped[float] = mapped_column(Float, default=0)
    summary: Mapped[str] = mapped_column(Text, default="")
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped[TrainingSession] = relationship("TrainingSession", back_populates="experiments")


class ResearchMemory(Base):
    """Persisted reusable findings from experiment outcomes."""

    __tablename__ = "research_memory"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("training_sessions.id"), nullable=False)
    experiment_id: Mapped[str] = mapped_column(ForeignKey("experiments.id"), nullable=False)
    target_agent_id: Mapped[str | None] = mapped_column(ForeignKey("agents.id"), nullable=True)
    level: Mapped[str] = mapped_column(String(2), default="L1")
    insight: Mapped[str] = mapped_column(Text, default="")
    reusable_pattern: Mapped[str] = mapped_column(Text, default="")
    anti_pattern: Mapped[str] = mapped_column(Text, default="")
    transferable_to: Mapped[list[str]] = mapped_column(JSONType, default=list)
    tags: Mapped[list[str]] = mapped_column(JSONType, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Deployment(Base):
    """Deployment events for experiment outputs."""

    __tablename__ = "deployments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("training_sessions.id"), nullable=False)
    scope: Mapped[DeploymentScope] = mapped_column(Enum(DeploymentScope), default=DeploymentScope.FULL_TREE)
    target_agent_ids: Mapped[list[str]] = mapped_column(JSONType, default=list)
    mode: Mapped[DeploymentMode] = mapped_column(Enum(DeploymentMode), default=DeploymentMode.REPLACE)
    canary_percentage: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[DeploymentStatus] = mapped_column(Enum(DeploymentStatus), default=DeploymentStatus.DEPLOYING)
    canary_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_score: Mapped[float] = mapped_column(Float, default=0.0)
    approved_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rollback_configs: Mapped[dict] = mapped_column(JSONType, default=dict)
    cross_tree_health_checks: Mapped[dict] = mapped_column(JSONType, default=dict)
    deployed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
