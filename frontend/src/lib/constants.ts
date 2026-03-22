export const AGENT_COLORS: Record<string, string> = {
  CustomerSupportOrchestrator: "#5b6af0",
  AuthAgent: "#40d0c0",
  BillingAgent: "#50a0f0",
  RefundAgent: "#36d8a0",
  TechSupportAgent: "#a070f0",
  EscalationAgent: "#f0b040",
  EligibilityCheck: "#60c890",
  RefundExecution: "#70b8d0",
};

export const ROLE_COLORS: Record<string, string> = {
  orchestrator: "#5b6af0",
  specialist: "#50a0f0",
  shared: "#40d0c0",
};

export const SCORE_THRESHOLDS = {
  green: 80,
  amber: 65,
} as const;

export function scoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.green) return "#36d8a0";
  if (score >= SCORE_THRESHOLDS.amber) return "#f0b040";
  return "#f06070";
}

export function scoreBg(score: number): string {
  if (score >= SCORE_THRESHOLDS.green) return "bg-green/10";
  if (score >= SCORE_THRESHOLDS.amber) return "bg-amber/10";
  return "bg-red/10";
}

export function scoreBorder(score: number): string {
  if (score >= SCORE_THRESHOLDS.green) return "border-green";
  if (score >= SCORE_THRESHOLDS.amber) return "border-amber";
  return "border-red";
}

export const LEVEL_LABELS: Record<string, string> = {
  L1: "Prompt Tuning",
  L2: "Tool Config",
  L3: "Routing Logic",
  L4: "Shared Library",
  L5: "Architecture",
};

export const LEVEL_COLORS: Record<string, string> = {
  L1: "#50a0f0",
  L2: "#40d0c0",
  L3: "#5b6af0",
  L4: "#a070f0",
  L5: "#f0b040",
};

export function agentColor(name: string): string {
  return AGENT_COLORS[name] || "#5b6af0";
}
