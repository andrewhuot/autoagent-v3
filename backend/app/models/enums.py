"""Shared enum definitions for AutoAgent domain tables."""

from enum import Enum


class SourceType(str, Enum):
    ADK_PYTHON = "adk_python"
    AGENT_STUDIO = "agent_studio"
    GIT_REPO = "git_repo"


class AgentType(str, Enum):
    LLM_AGENT = "llm_agent"
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    LOOP = "loop"
    CUSTOM = "custom"


class AgentRole(str, Enum):
    ORCHESTRATOR = "orchestrator"
    SPECIALIST = "specialist"
    WORKFLOW = "workflow"
    SHARED = "shared"


class EvalLevel(str, Enum):
    SPECIALIST_UNIT = "specialist_unit"
    ROUTING = "routing"
    END_TO_END = "end_to_end"
    CROSS_TREE = "cross_tree"


class EvalSource(str, Enum):
    AUTO_GENERATED = "auto_generated"
    MANUAL = "manual"
    PRODUCTION = "production"


class SessionStatus(str, Enum):
    CONFIGURING = "configuring"
    RUNNING = "running"
    COMPLETED = "completed"
    STOPPED = "stopped"


class ExperimentStatus(str, Enum):
    RUNNING = "running"
    KEPT = "kept"
    REVERTED = "reverted"
    SYNTHESIS = "synthesis"


class DeploymentScope(str, Enum):
    FULL_TREE = "full_tree"
    SINGLE_AGENT = "single_agent"
    LIBRARY_AGENT = "library_agent"


class DeploymentMode(str, Enum):
    REPLACE = "replace"
    CANARY = "canary"


class DeploymentStatus(str, Enum):
    DEPLOYING = "deploying"
    ACTIVE = "active"
    PROMOTED = "promoted"
    ROLLED_BACK = "rolled_back"
