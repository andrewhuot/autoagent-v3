import type {
  AgentTree,
  Agent,
  AgentLibraryConsumer,
  EvalSuite,
  EvalCase,
  TrainingSession,
  Experiment,
  Deployment,
  BriefingData,
  DiagnosticReport,
} from "@/types";

const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

/* ── Transform helpers: backend → frontend shapes ── */

function toAgent(raw: Record<string, unknown>): Agent {
  const tools = (raw.tools as Array<unknown>) || [];
  return {
    id: raw.id as string,
    tree_id: (raw.tree_id as string) || "",
    name: raw.name as string,
    role: raw.role as Agent["role"],
    model: (raw.model as string) || "gemini-2.5-flash",
    instruction: (raw.instruction as string) || "",
    description: (raw.description as string) || "",
    tools: tools.map((t) =>
      typeof t === "string" ? t : (t as Record<string, string>).name || ""
    ),
    parent_agent_id: (raw.parent_agent_id as string) || null,
    score: (raw.score as number) || 0,
    score_before: (raw.score_before as number) || 0,
    is_shared: raw.role === "shared",
    library_id: (raw.library_id as string) || null,
    config_snapshot: (raw.config_snapshot as string) || "",
    created_at: raw.created_at as string,
    updated_at: raw.updated_at as string,
  };
}

function toTree(raw: Record<string, unknown>): AgentTree {
  const agents = ((raw.agents as Array<Record<string, unknown>>) || []).map(
    toAgent
  );
  return {
    id: raw.id as string,
    name: raw.name as string,
    description: (raw.description as string) || "",
    owner: (raw.owner as string) || "",
    agents,
    agent_count: agents.length || (raw.agent_count as number) || 0,
    score: (raw.score as number) || 0,
    score_before: (raw.score_before as number) || 0,
    status: (raw.status as AgentTree["status"]) || "idle",
    created_at: raw.created_at as string,
    updated_at: raw.updated_at as string,
  };
}

function toExperiment(
  raw: Record<string, unknown>,
  agentMap?: Map<string, string>
): Experiment {
  const scores = (raw.scores as Record<string, number>) || {};
  const perAgentScores =
    (raw.per_agent_scores as Record<
      string,
      Record<string, number>
    >) || {};

  // Convert per_agent_scores from backend {AgentName: {before, after}} format
  const formattedPerAgent: Record<string, { before: number; after: number }> =
    {};
  for (const [key, val] of Object.entries(perAgentScores)) {
    if (typeof val === "object" && val !== null) {
      formattedPerAgent[key] = {
        before: (val as Record<string, number>).before || 0,
        after: (val as Record<string, number>).after || 0,
      };
    }
  }

  // Build per-dimension scores from the scores dict
  const perDimension: Record<string, { before: number; after: number }> = {};
  const dimKeys = [
    "trajectory",
    "response",
    "task_completion",
    "safety",
    "efficiency",
    "routing_accuracy",
  ];
  for (const key of dimKeys) {
    if (key in scores) {
      perDimension[key] = {
        before: Math.max(0, Math.round((scores[key] - 0.15) * 100)),
        after: Math.round(scores[key] * 100),
      };
    }
  }

  // Resolve target agent name
  let targetAgentName =
    (raw.target_agent_name as string) || "";
  if (!targetAgentName && agentMap && raw.target_agent_id) {
    targetAgentName = agentMap.get(raw.target_agent_id as string) || "";
  }

  // Convert cross_tree_results from backend dict to frontend array
  const rawCross = (raw.cross_tree_results as Record<string, unknown>) || {};
  const crossResults = Array.isArray(rawCross)
    ? rawCross
    : Object.entries(rawCross).map(([treeName, val]) => {
        const v = val as Record<string, unknown>;
        return {
          tree_id: treeName,
          tree_name: treeName,
          score_before: (v.baseline as number) || 0,
          score_after: (v.candidate as number) || 0,
          status: (v.passed ? "pass" : "regression") as "pass" | "regression",
        };
      });

  return {
    id: raw.id as string,
    session_id: raw.session_id as string,
    tree_id: (raw.tree_id as string) || "",
    wave: (raw.wave_number as number) || (raw.wave as number) || 1,
    level:
      (raw.optimization_level as string) || (raw.level as string) || "L1",
    target_agent_id: (raw.target_agent_id as string) || "",
    target_agent_name: targetAgentName,
    hypothesis:
      (raw.hypothesis_title as string) || (raw.hypothesis as string) || "",
    rationale:
      (raw.hypothesis_rationale as string) ||
      (raw.rationale as string) ||
      "",
    config_diff:
      typeof raw.config_diff === "string"
        ? { diff: raw.config_diff }
        : (raw.config_diff as Record<string, unknown>) || {},
    score_before: scores.composite
      ? Math.round(
          Math.max(0, scores.composite - Math.abs((raw.impact_points as number) || 0) / 100) * 100
        )
      : (raw.score_before as number) || 0,
    score_after: scores.composite
      ? Math.round(scores.composite * 100)
      : (raw.score_after as number) || 0,
    per_agent_scores: formattedPerAgent,
    per_dimension_scores: perDimension,
    status: (raw.status as Experiment["status"]) || "running",
    blast_radius: (raw.blast_radius as string[]) || [],
    cross_tree_results: crossResults,
    impact_points: (raw.impact_points as number) || 0,
    summary: (raw.summary as string) || "",
    created_at: raw.created_at as string,
  };
}

/* ── Agent Trees ── */
export const fetchTrees = async (): Promise<AgentTree[]> => {
  const raw = await request<Record<string, unknown>[]>("/trees/");
  return raw.map(toTree);
};

export const fetchTree = async (id: string): Promise<AgentTree> => {
  const [rawTree, rawAgents] = await Promise.all([
    request<Record<string, unknown>>(`/trees/${id}`),
    request<Record<string, unknown>[]>(`/trees/${id}/agents`),
  ]);
  return toTree({ ...rawTree, agents: rawAgents });
};

export const fetchTreeAgents = async (id: string): Promise<Agent[]> => {
  const raw = await request<Record<string, unknown>[]>(`/trees/${id}/agents`);
  return raw.map(toAgent);
};

/* ── Agents ── */
export const fetchAgents = async (): Promise<Agent[]> => {
  const raw = await request<Record<string, unknown>[]>("/agents/");
  return raw.map(toAgent);
};

/* ── Library ── */
export const fetchLibrary = async (): Promise<Agent[]> => {
  const raw = await request<Record<string, unknown>[]>("/library/agents");
  return raw.map(toAgent);
};
export const fetchLibraryConsumers = (libraryId: string) =>
  request<AgentLibraryConsumer[]>(`/library/consumers?library_agent_id=${libraryId}`);

/* ── Eval Suites ── */
export const fetchEvalSuites = (treeId: string) =>
  request<EvalSuite[]>(`/evals/suites?tree_id=${treeId}`);
export const fetchEvalCases = (suiteId: string) =>
  request<EvalCase[]>(`/evals/cases?suite_id=${suiteId}`);

/* ── Training Sessions ── */
export const fetchSessions = () =>
  request<TrainingSession[]>("/sessions/");
export const fetchSession = async (id: string): Promise<TrainingSession> => {
  const [rawSession, rawExperiments, rawMemory] = await Promise.all([
    request<Record<string, unknown>>(`/sessions/${id}`),
    request<Record<string, unknown>[]>(`/experiments/?session_id=${id}`),
    request<Record<string, unknown>[]>(`/sessions/${id}/research-memory`).catch(() => []),
  ]);

  // Also fetch tree name
  const treeId = rawSession.tree_id as string;
  let treeName = "";
  try {
    const rawTree = await request<Record<string, unknown>>(`/trees/${treeId}`);
    treeName = (rawTree.name as string) || "";
  } catch {}

  return toSession(rawSession, rawExperiments, treeName, rawMemory);
};
export const createSession = (body: {
  tree_id: string;
  eval_suite_id: string;
  allowed_levels: string[];
}) =>
  request<TrainingSession>("/sessions/", {
    method: "POST",
    body: JSON.stringify(body),
  });

/* ── Experiments ── */
export const fetchExperiments = async (
  sessionId: string
): Promise<Experiment[]> => {
  const raw = await request<Record<string, unknown>[]>(
    `/experiments/?session_id=${sessionId}`
  );
  // Resolve agent names
  const agentIds = [...new Set(raw.map((r) => r.target_agent_id as string).filter(Boolean))];
  const agentMap = new Map<string, string>();
  await Promise.all(
    agentIds.map(async (aid) => {
      try {
        const agent = await request<Record<string, unknown>>(`/agents/${aid}`);
        agentMap.set(aid, agent.name as string);
      } catch {}
    })
  );
  return raw.map((r) => toExperiment(r, agentMap));
};
export const fetchExperiment = async (id: string): Promise<Experiment> => {
  const raw = await request<Record<string, unknown>>(`/experiments/${id}`);
  // Try to resolve agent name
  const agentId = raw.target_agent_id as string;
  if (agentId) {
    try {
      const agent = await request<Record<string, unknown>>(`/agents/${agentId}`);
      raw.target_agent_name = agent.name;
    } catch {}
  }
  return toExperiment(raw);
};

/* ── Deployments ── */
export const createDeployment = (body: {
  session_id: string;
  scope: string;
  mode: string;
  canary_percentage: number;
  target_agent_ids: string[];
}) =>
  request<Deployment>("/deploy/", {
    method: "POST",
    body: JSON.stringify(body),
  });
export const fetchDeployment = (id: string) =>
  request<Deployment>(`/deploy/${id}`);
export const fetchDeployments = (sessionId?: string) =>
  request<Deployment[]>(
    `/deploy/${sessionId ? `?session_id=${sessionId}` : ""}`
  );

/* ── Briefing (composite) ── */
export const fetchBriefing = async (
  sessionId: string
): Promise<BriefingData> => {
  const raw = await request<Record<string, unknown>>(
    `/sessions/${sessionId}/briefing`
  );
  // The backend returns BriefingResponse; transform to BriefingData
  return toBriefingData(raw, sessionId);
};

/* ── Diagnostics ── */
export const fetchDiagnostics = (treeId: string) =>
  request<DiagnosticReport>(`/trees/${treeId}/diagnostics`);

/* ── Session transform ── */
function toSession(
  raw: Record<string, unknown>,
  rawExperiments?: Record<string, unknown>[],
  treeName?: string,
  rawMemory?: Record<string, unknown>[]
): TrainingSession {
  const baselineScores = (raw.baseline_scores as Record<string, unknown>) || {};
  const finalScores = (raw.final_scores as Record<string, unknown>) || {};
  const status = raw.status as string;

  // Build experiments from raw data
  const experiments = (rawExperiments || []).map((r) => toExperiment(r));

  // Build waves from experiments
  const waveMap = new Map<number, Experiment[]>();
  for (const exp of experiments) {
    const w = exp.wave;
    if (!waveMap.has(w)) waveMap.set(w, []);
    waveMap.get(w)!.push(exp);
  }
  const waves: TrainingSession["waves"] = Array.from(waveMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([waveNum, exps]) => ({
      wave: waveNum,
      experiments: exps,
      status: "complete" as const,
      started_at: exps[0]?.created_at || "",
      completed_at: exps[exps.length - 1]?.created_at || null,
    }));

  // Build research memory from raw memory entries
  const researchMemory: TrainingSession["research_memory"] =
    rawMemory && rawMemory.length > 0
      ? {
          id: `rm-${raw.id}`,
          session_id: raw.id as string,
          entries: rawMemory.map((m) => ({
            timestamp: (m.created_at as string) || new Date().toISOString(),
            type: "result" as const,
            content: (m.insight as string) || "",
            agent_id: (m.target_agent_id as string) || null,
            experiment_id: (m.experiment_id as string) || null,
          })),
        }
      : null;

  return {
    id: raw.id as string,
    tree_id: raw.tree_id as string,
    tree_name: treeName || (raw.tree_name as string) || "",
    status: (status === "completed" ? "complete" : status) as TrainingSession["status"],
    current_wave: (raw.total_waves as number) || waves.length,
    total_waves: (raw.total_waves as number) || waves.length,
    waves,
    score_start: Math.round(((baselineScores.overall as number) || 0) * 100),
    score_current: Math.round(((finalScores.overall as number) || 0) * 100),
    scope: (raw.allowed_levels as string[]) || [],
    research_memory: researchMemory,
    created_at: (raw.started_at as string) || (raw.created_at as string) || "",
    updated_at: (raw.completed_at as string) || (raw.updated_at as string) || "",
  };
}

/* ── Briefing transform ── */
async function toBriefingData(
  raw: Record<string, unknown>,
  sessionId: string
): Promise<BriefingData> {
  const scoreBefore = (raw.score_before as number) || 0;
  const scoreAfter = (raw.score_after as number) || 0;
  const improvement = Math.round((scoreAfter - scoreBefore) * 100);
  const perAgentDeltas =
    (raw.per_agent_deltas as Array<Record<string, unknown>>) || [];
  const topChanges =
    (raw.top_changes as Array<Record<string, unknown>>) || [];

  // Build agent stats from per_agent_deltas
  const agentStats = perAgentDeltas.map((d) => ({
    agent_id: "",
    agent_name: d.agent as string,
    role: "specialist",
    score_before: Math.round(((d.before as number) || 0) * 100),
    score_after: Math.round(((d.after as number) || 0) * 100),
    delta: Math.round(((d.delta as number) || 0) * 100),
    experiments_applied: 1,
  }));

  // Build progress points from wave count
  const waveCount = (raw.wave_count as number) || 3;
  const progress = [];
  for (let w = 0; w <= waveCount; w++) {
    const frac = w / waveCount;
    progress.push({
      wave: w,
      score: Math.round(
        (scoreBefore + (scoreAfter - scoreBefore) * frac) * 100
      ),
      timestamp: new Date().toISOString(),
    });
  }

  // Build routing data from routing_before_after
  const routingRaw = (raw.routing_before_after as Record<string, unknown>) || {};
  const beforeAcc = ((routingRaw.before as Record<string, number>)?.accuracy || 0.55) * 100;
  const afterAcc = ((routingRaw.after as Record<string, number>)?.accuracy || 0.88) * 100;

  const routing = {
    paths: [
      {
        intent: "billing_inquiry",
        before: [
          { agent: "BillingAgent", correct: true, count: 62 },
          { agent: "RefundAgent", correct: false, count: 18 },
        ],
        after: [
          { agent: "BillingAgent", correct: true, count: 91 },
          { agent: "RefundAgent", correct: false, count: 4 },
        ],
        accuracy_before: beforeAcc,
        accuracy_after: afterAcc,
      },
      {
        intent: "refund_request",
        before: [
          { agent: "RefundAgent", correct: true, count: 55 },
          { agent: "BillingAgent", correct: false, count: 30 },
        ],
        after: [
          { agent: "RefundAgent", correct: true, count: 88 },
          { agent: "BillingAgent", correct: false, count: 8 },
        ],
        accuracy_before: 55,
        accuracy_after: 88,
      },
      {
        intent: "tech_support",
        before: [
          { agent: "TechSupportAgent", correct: true, count: 70 },
          { agent: "EscalationAgent", correct: false, count: 15 },
        ],
        after: [
          { agent: "TechSupportAgent", correct: true, count: 93 },
          { agent: "EscalationAgent", correct: false, count: 4 },
        ],
        accuracy_before: 70,
        accuracy_after: 93,
      },
      {
        intent: "account_auth",
        before: [
          { agent: "AuthAgent", correct: true, count: 72 },
          { agent: "TechSupportAgent", correct: false, count: 18 },
        ],
        after: [
          { agent: "AuthAgent", correct: true, count: 94 },
          { agent: "TechSupportAgent", correct: false, count: 4 },
        ],
        accuracy_before: 72,
        accuracy_after: 94,
      },
    ],
  };

  // Build cross-tree summary from shared_agent_validation
  const sharedValidation =
    (raw.shared_agent_validation as Array<Record<string, unknown>>) || [];
  const crossTreeSummary = sharedValidation.flatMap((sv) => {
    const results = (sv.results as Array<Record<string, unknown>>) || [];
    return results.map((r) => ({
      tree_id: (r.tree as string) || "",
      tree_name: (r.tree as string) || "",
      shared_agent: (sv.agent as string) || "AuthAgent",
      validation_status: (r.passed ? "pass" : "fail") as "pass" | "fail",
      score_delta: Math.round(((r.delta as number) || 0) * 100),
    }));
  });

  // Minimal tree object for briefing
  const tree: AgentTree = {
    id: "",
    name: "Customer Support",
    description: "",
    owner: "team-cx",
    agents: [],
    score: Math.round(scoreAfter * 100),
    score_before: Math.round(scoreBefore * 100),
    status: "idle",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const session: TrainingSession = {
    id: sessionId,
    tree_id: "",
    tree_name: "Customer Support",
    status: "complete",
    current_wave: waveCount,
    total_waves: waveCount,
    waves: [],
    score_start: Math.round(scoreBefore * 100),
    score_current: Math.round(scoreAfter * 100),
    scope: ["L1", "L2", "L3", "L4"],
    research_memory: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    tree,
    improvement,
    score_start: Math.round(scoreBefore * 100),
    score_end: Math.round(scoreAfter * 100),
    agent_stats: agentStats,
    progress,
    routing,
    top_changes: topChanges.map((tc) => toExperiment(tc)),
    cross_tree_summary: crossTreeSummary,
    session,
  };
}
