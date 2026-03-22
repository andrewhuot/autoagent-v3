"""Pydantic schemas for API request/response payloads."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AgentTreeBase(BaseModel):
    """Common fields for creating and reading agent trees."""

    name: str
    description: str = ""
    owner: str = ""
    source_type: str
    source_ref: str
    tree_profile: dict = Field(default_factory=dict)


class AgentTreeCreate(AgentTreeBase):
    """Payload for creating a tree."""


class AgentTreeRead(AgentTreeBase):
    """Read model for agent tree resources."""

    id: str
    score: float = 0.0
    score_before: float = 0.0
    status: str = "idle"
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AgentBase(BaseModel):
    """Common agent payload fields."""

    tree_id: str | None = None
    library_id: str | None = None
    name: str
    agent_type: str
    role: str
    parent_agent_id: str | None = None
    instruction: str = ""
    description: str = ""
    model: str = "gemini-2.5-flash"
    tools: list[dict] = Field(default_factory=list)
    config_snapshot: str = ""


class AgentCreate(AgentBase):
    """Payload for creating an agent."""


class AgentRead(AgentBase):
    """Read model for agent resources."""

    id: str
    score: float = 0.0
    score_before: float = 0.0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AgentLibraryConsumerCreate(BaseModel):
    """Payload for linking a shared agent to a consuming tree."""

    library_agent_id: str
    consumer_tree_id: str
    integration_point: str


class AgentLibraryConsumerRead(AgentLibraryConsumerCreate):
    """Read model for library-consumer links."""

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EvalSuiteCreate(BaseModel):
    """Payload for creating an eval suite."""

    tree_id: str
    name: str
    category_weights: dict = Field(default_factory=dict)
    safety_floor: float = 0.9
    routing_floor: float = 0.7


class EvalSuiteRead(EvalSuiteCreate):
    """Read model for eval suites."""

    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EvalCaseCreate(BaseModel):
    """Payload for creating a single eval case."""

    suite_id: str
    level: str
    target_agent_id: str | None = None
    category: str = "general"
    source: str = "auto_generated"
    enabled: bool = True
    scenario_json: dict = Field(default_factory=dict)
    expected_agent_sequence: list = Field(default_factory=list)
    expected_trajectory: list = Field(default_factory=list)
    expected_response: str = ""
    mock_tool_outputs: dict = Field(default_factory=dict)


class EvalCaseRead(EvalCaseCreate):
    """Read model for eval cases."""

    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TrainingSessionCreate(BaseModel):
    """Payload for creating a training session."""

    tree_id: str
    eval_suite_id: str
    strategy_md: str = ""
    allowed_levels: list[str] = Field(default_factory=lambda: ["L1", "L2", "L3"])
    config: dict = Field(default_factory=dict)


class TrainingSessionRead(TrainingSessionCreate):
    """Read model for training sessions."""

    id: str
    status: str
    baseline_scores: dict
    final_scores: dict
    total_experiments: int
    total_waves: int = 0
    started_at: datetime | None
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class ExperimentCreate(BaseModel):
    """Payload for creating an experiment record."""

    session_id: str
    wave_number: int = 1
    branch_id: str = "A"
    parent_id: str | None = None
    target_agent_id: str | None = None
    optimization_level: str = "L1"
    blast_radius: list[str] = Field(default_factory=list)
    hypothesis_title: str
    hypothesis_rationale: str
    config_diff: str = ""
    per_agent_config_diffs: dict = Field(default_factory=dict)
    status: str = "running"
    scores: dict = Field(default_factory=dict)
    per_agent_scores: dict = Field(default_factory=dict)
    routing_accuracy: float = 0.0
    cross_tree_results: dict = Field(default_factory=dict)
    eval_scope_used: dict = Field(default_factory=dict)
    impact_points: float = 0.0
    summary: str = ""
    tokens_used: int = 0
    duration_ms: int = 0


class ExperimentRead(ExperimentCreate):
    """Read model for experiments."""

    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResearchMemoryCreate(BaseModel):
    """Payload for persisting experiment insights."""

    session_id: str
    experiment_id: str
    target_agent_id: str | None = None
    level: str
    insight: str
    reusable_pattern: str = ""
    anti_pattern: str = ""
    transferable_to: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class ResearchMemoryRead(ResearchMemoryCreate):
    """Read model for research memory entries."""

    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DeploymentCreate(BaseModel):
    """Payload for deployment requests."""

    session_id: str
    scope: str
    target_agent_ids: list[str] = Field(default_factory=list)
    mode: str = "replace"
    canary_percentage: int = 0
    status: str = "deploying"
    canary_score: float | None = None
    target_score: float = 0.0
    approved_by: str | None = None
    rollback_configs: dict = Field(default_factory=dict)
    cross_tree_health_checks: dict = Field(default_factory=dict)


class DeploymentRead(DeploymentCreate):
    """Read model for deployment records."""

    id: str
    deployed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HealthScanResponse(BaseModel):
    """Health scan payload for tree diagnostics."""

    overall_score: float
    tree_level_scores: dict[str, float]
    per_agent_scores: dict[str, dict]
    opportunities: list[dict]


class WizardConfigRequest(BaseModel):
    """Configuration choices submitted from the config wizard."""

    optimization_scope: list[str]
    category_weights: dict[str, float] = Field(default_factory=dict)
    enabled_eval_case_ids: list[str] = Field(default_factory=list)


class RoutingMetrics(BaseModel):
    """Routing before/after metrics for the flow view."""

    label: str
    accuracy: float
    paths: list[dict]


class BriefingResponse(BaseModel):
    """Morning briefing aggregate payload."""

    session_id: str
    headline_delta: str
    score_before: float
    score_after: float
    experiment_count: int
    wave_count: int
    per_agent_deltas: list[dict]
    routing_before_after: dict
    top_changes: list[dict]
    shared_agent_validation: list[dict]
