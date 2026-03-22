/* ───────────────────────────────────────────────
 * Core Domain Models
 * ─────────────────────────────────────────────── */

export interface Agent {
  id: string;
  tree_id: string;
  name: string;
  role: "orchestrator" | "specialist" | "shared" | "workflow";
  model: string;
  instruction: string;
  description: string;
  tools: string[];
  parent_agent_id: string | null;
  score: number;
  score_before: number;
  is_shared: boolean;
  library_id: string | null;
  config_snapshot: string;
  created_at: string;
  updated_at: string;
}

export interface AgentTree {
  id: string;
  name: string;
  description: string;
  owner: string;
  agents: Agent[];
  agent_count?: number;
  score: number;
  score_before: number;
  status: "idle" | "training" | "evaluating" | "deploying";
  created_at: string;
  updated_at: string;
}

export interface AgentLibraryConsumer {
  library_agent_id: string;
  consumer_tree_id: string;
  integration_point: string;
  created_at: string;
}

export interface EvalCase {
  id: string;
  suite_id: string;
  level: string;
  target_agent_id: string | null;
  category: string;
  source: string;
  enabled: boolean;
  scenario_json: Record<string, unknown>;
  expected_agent_sequence: string[];
  expected_trajectory: Record<string, unknown>[];
  expected_response: string;
  created_at: string;
}

export interface EvalSuite {
  id: string;
  tree_id: string;
  name: string;
  category_weights: Record<string, number>;
  safety_floor: number;
  routing_floor: number;
  created_at: string;
}

export interface Experiment {
  id: string;
  session_id: string;
  tree_id: string;
  wave: number;
  level: string;
  target_agent_id: string;
  target_agent_name: string;
  hypothesis: string;
  rationale: string;
  config_diff: Record<string, unknown>;
  score_before: number;
  score_after: number;
  per_agent_scores: Record<string, { before: number; after: number }>;
  per_dimension_scores: Record<string, { before: number; after: number }>;
  status: "pending" | "running" | "kept" | "reverted" | "error" | "synthesis";
  blast_radius: string[];
  cross_tree_results: CrossTreeResult[];
  impact_points: number;
  summary: string;
  created_at: string;
}

export interface CrossTreeResult {
  tree_id: string;
  tree_name: string;
  score_before: number;
  score_after: number;
  status: "pass" | "regression";
}

export interface ResearchMemory {
  id: string;
  session_id: string;
  entries: ResearchEntry[];
}

export interface ResearchEntry {
  timestamp: string;
  type: "observation" | "hypothesis" | "result" | "decision";
  content: string;
  agent_id: string | null;
  experiment_id: string | null;
}

export interface WaveData {
  wave: number;
  experiments: Experiment[];
  status: "pending" | "running" | "complete";
  started_at: string;
  completed_at: string | null;
}

export interface TrainingSession {
  id: string;
  tree_id: string;
  tree_name: string;
  status: "initializing" | "configuring" | "running" | "paused" | "complete" | "completed" | "failed" | "stopped";
  current_wave: number;
  total_waves: number;
  waves: WaveData[];
  score_start: number;
  score_current: number;
  scope: string[];
  research_memory: ResearchMemory | null;
  created_at: string;
  updated_at: string;
}

export interface Deployment {
  id: string;
  session_id: string;
  status: "pending" | "deploying" | "canary" | "active" | "rolling" | "complete" | "promoted" | "rolled_back";
  canary_percent: number;
  canary_score: number | null;
  target_score: number;
  approved_by: string | null;
  scope: string;
  mode: string;
  target_agent_ids: string[];
  deployed_at: string;
}

/* ───────────────────────────────────────────────
 * View / UI Models
 * ─────────────────────────────────────────────── */

export interface AgentTreeProfile {
  tree: AgentTree;
  experiments: Experiment[];
  topChanges: Experiment[];
  routingData: RoutingData;
}

export interface DiagnosticReport {
  tree_id: string;
  agents: AgentDiagnostic[];
  opportunities: Opportunity[];
}

export interface AgentDiagnostic {
  agent_id: string;
  agent_name: string;
  role: string;
  score: number;
  score_before: number;
  dimensions: Record<string, number>;
  issues: string[];
}

export interface Opportunity {
  id: string;
  agent_id: string;
  agent_name: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  level: "L1" | "L2" | "L3" | "L4" | "L5";
  estimated_impact: number;
}

export interface RoutingData {
  paths: RoutingPath[];
}

export interface RoutingPath {
  intent: string;
  before: RoutingStep[];
  after: RoutingStep[];
  accuracy_before: number;
  accuracy_after: number;
}

export interface RoutingStep {
  agent: string;
  correct: boolean;
  count: number;
}

export interface BriefingData {
  tree: AgentTree;
  improvement: number;
  score_start: number;
  score_end: number;
  agent_stats: AgentStat[];
  progress: ProgressPoint[];
  routing: RoutingData;
  top_changes: Experiment[];
  cross_tree_summary: CrossTreeSummary[];
  session: TrainingSession;
}

export interface AgentStat {
  agent_id: string;
  agent_name: string;
  role: string;
  score_before: number;
  score_after: number;
  delta: number;
  experiments_applied: number;
}

export interface ProgressPoint {
  wave: number;
  score: number;
  timestamp: string;
}

export interface CrossTreeSummary {
  tree_id: string;
  tree_name: string;
  shared_agent: string;
  validation_status: "pass" | "fail" | "pending";
  score_delta: number;
}
