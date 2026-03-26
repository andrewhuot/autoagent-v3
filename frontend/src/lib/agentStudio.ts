import type { Agent } from "@/types";

export type StudioChangeKind = "instruction" | "routing" | "tooling" | "policy";
export type StudioImpact = "low" | "medium" | "high";
export type StudioMetricTone = "positive" | "neutral" | "caution";

export interface StudioChangeItem {
  id: string;
  kind: StudioChangeKind;
  title: string;
  detail: string;
  before: string;
  after: string;
  impact: StudioImpact;
}

export interface StudioMetric {
  label: string;
  current: string;
  projected: string;
  tone: StudioMetricTone;
}

export interface StudioDraft {
  prompt: string;
  title: string;
  branchName: string;
  summary: string;
  focusAgent: Agent;
  supportingAgents: Agent[];
  changeSet: StudioChangeItem[];
  metrics: StudioMetric[];
  reviewChecklist: string[];
}

const AGENT_ALIASES: Array<{ name: string; aliases: string[] }> = [
  {
    name: "CustomerSupportOrchestrator",
    aliases: ["orchestrator", "router", "triage", "handoff", "route"],
  },
  {
    name: "BillingAgent",
    aliases: ["billingagent", "billing", "invoice", "charge", "payment"],
  },
  {
    name: "RefundAgent",
    aliases: ["refundagent", "refund", "return"],
  },
  {
    name: "TechSupportAgent",
    aliases: ["techsupportagent", "tech", "support", "diagnostic"],
  },
  {
    name: "EscalationAgent",
    aliases: ["escalationagent", "escalate", "human", "associate", "vip"],
  },
  {
    name: "AuthAgent",
    aliases: ["authagent", "auth", "verify", "identity", "login"],
  },
];

function clampImpactScore(value: number): StudioImpact {
  if (value >= 8) return "high";
  if (value >= 5) return "medium";
  return "low";
}

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function findAgentByName(name: string, agents: Agent[]): Agent | undefined {
  return agents.find((agent) => agent.name === name);
}

function rankAgents(prompt: string, agents: Agent[]): Agent[] {
  const normalized = prompt.toLowerCase();

  return agents
    .map((agent) => {
      const aliasEntry = AGENT_ALIASES.find((entry) => entry.name === agent.name);
      const aliasScore =
        aliasEntry?.aliases.reduce((score, alias) => {
          return normalized.includes(alias) ? score + 3 : score;
        }, 0) ?? 0;
      const directNameScore = normalized.includes(agent.name.toLowerCase()) ? 6 : 0;
      const roleScore = normalized.includes(agent.role.toLowerCase()) ? 1 : 0;

      return {
        agent,
        score: aliasScore + directNameScore + roleScore,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.agent);
}

function buildBaseReviewChecklist(prompt: string): string[] {
  const normalized = prompt.toLowerCase();
  const checklist = [
    "Verify the diff keeps the original tone and domain constraints intact.",
    "Run a simulation that covers the highest-volume customer path.",
  ];

  if (normalized.includes("vip") || normalized.includes("escalat")) {
    checklist.push("Replay a VIP refund conversation through the new path.");
  }

  if (normalized.includes("invoice") || normalized.includes("billing")) {
    checklist.push("Confirm the agent verifies invoice context before issuing an answer.");
  }

  if (normalized.includes("route") || normalized.includes("handoff")) {
    checklist.push("Inspect the handoff transcript to make sure context is preserved end-to-end.");
  }

  return checklist;
}

function dedupeAgents(agents: Array<Agent | undefined>): Agent[] {
  const unique = new Map<string, Agent>();
  for (const agent of agents) {
    if (agent) {
      unique.set(agent.id, agent);
    }
  }
  return Array.from(unique.values());
}

export function buildStudioDraft(prompt: string, agents: Agent[]): StudioDraft {
  const normalized = prompt.trim().toLowerCase();
  const rankedAgents = rankAgents(prompt, agents);
  const focusAgent = rankedAgents[0] ?? agents[0];
  const refundAgent = findAgentByName("RefundAgent", agents);
  const escalationAgent = findAgentByName("EscalationAgent", agents);
  const orchestrator = findAgentByName("CustomerSupportOrchestrator", agents);

  const changeSet: StudioChangeItem[] = [];

  if (normalized.includes("invoice") || normalized.includes("billing")) {
    changeSet.push({
      id: "invoice-guardrail",
      kind: "instruction",
      title: "Invoice-first response guardrail",
      detail:
        "Require the focus agent to ground billing answers in fresh invoice or order context before replying.",
      before: focusAgent.instruction,
      after: `${focusAgent.instruction} Before answering any balance, payment, or shipping question, verify the invoice or order record and cite the finding in the reply.`,
      impact: clampImpactScore(8),
    });
  }

  if (
    normalized.includes("vip") ||
    normalized.includes("priority") ||
    normalized.includes("escalat") ||
    normalized.includes("associate")
  ) {
    changeSet.push({
      id: "vip-escalation",
      kind: "policy",
      title: "VIP escalation fast lane",
      detail:
        "Escalate frustrated or high-value cases earlier and avoid forcing a repeated self-serve loop.",
      before: focusAgent.instruction,
      after: `${focusAgent.instruction} If the customer is marked VIP, references repeated frustration, or the refund value is high, hand off to ${escalationAgent?.name ?? "EscalationAgent"} within two turns.`,
      impact: clampImpactScore(9),
    });
  }

  if (normalized.includes("route") || normalized.includes("handoff") || normalized.includes("transfer")) {
    changeSet.push({
      id: "routing-refresh",
      kind: "routing",
      title: "Context-preserving routing update",
      detail:
        "Tighten the orchestrator handoff path so downstream specialists inherit the full conversation state.",
      before: orchestrator?.instruction ?? "Route customer needs to specialists and preserve context.",
      after: `${orchestrator?.instruction ?? "Route customer needs to specialists and preserve context."} Include customer tier, prior actions, and confidence score in every handoff packet.`,
      impact: clampImpactScore(7),
    });
  }

  if (
    normalized.includes("tool") ||
    normalized.includes("shopify") ||
    normalized.includes("refund") ||
    normalized.includes("shipment")
  ) {
    const toolAgent = refundAgent ?? focusAgent;
    changeSet.push({
      id: "tooling-sync",
      kind: "tooling",
      title: "Tool-backed resolution check",
      detail:
        "Add a required system lookup before the agent approves a refund or shipping promise.",
      before: toolAgent.tools.join(", "),
      after: [...toolAgent.tools, "lookup_fulfillment_status"].join(", "),
      impact: clampImpactScore(6),
    });
  }

  if (changeSet.length === 0) {
    changeSet.push({
      id: "prompt-refresh",
      kind: "instruction",
      title: `${titleCase(focusAgent.role)} prompt refresh`,
      detail:
        "Translate the natural-language request into a tighter prompt with clearer execution boundaries.",
      before: focusAgent.instruction,
      after: `${focusAgent.instruction} Apply the user's latest guidance while keeping existing safety policies and tooling constraints intact.`,
      impact: clampImpactScore(5),
    });
  }

  const supportingAgents = dedupeAgents([
    focusAgent.parent_agent_id
      ? agents.find((agent) => agent.id === focusAgent.parent_agent_id)
      : orchestrator,
    refundAgent && normalized.includes("refund") ? refundAgent : undefined,
    escalationAgent &&
    (normalized.includes("vip") || normalized.includes("escalat"))
      ? escalationAgent
      : undefined,
  ]).filter((agent) => agent.id !== focusAgent.id);

  const metrics: StudioMetric[] = [
    {
      label: "Trajectory score",
      current: `${focusAgent.score_before}%`,
      projected: `${Math.min(99, focusAgent.score + changeSet.length * 2)}%`,
      tone: "positive",
    },
    {
      label: "Queued changes",
      current: "0",
      projected: String(changeSet.length),
      tone: "neutral",
    },
    {
      label: "Regression watch",
      current: "2",
      projected: normalized.includes("vip") ? "4" : "3",
      tone: normalized.includes("vip") ? "caution" : "neutral",
    },
  ];

  return {
    prompt,
    title: `Draft ${titleCase(focusAgent.role)} update`,
    branchName: `studio/${focusAgent.name.toLowerCase()}-${changeSet.length}-change-set`,
    summary: `Translated a plain-language request into ${changeSet.length} queued updates for ${focusAgent.name}.`,
    focusAgent,
    supportingAgents,
    changeSet,
    metrics,
    reviewChecklist: buildBaseReviewChecklist(prompt),
  };
}
