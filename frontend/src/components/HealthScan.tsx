import { useMemo } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import AgentTreeVisualizer from "./AgentTreeVisualizer";
import { scoreColor, scoreBg, scoreBorder, LEVEL_LABELS, LEVEL_COLORS, agentColor } from "@/lib/constants";
import { mockTree, mockDiagnostics } from "@/lib/mockData";
import { useApiWithFallback } from "@/hooks/useApi";
import { fetchTree, fetchDiagnostics } from "@/lib/api";
import type { AgentTree, DiagnosticReport } from "@/types";

interface Props {
  treeId: string;
}

const priorityStyles: Record<string, string> = {
  critical: "bg-red/15 text-red border-red/30",
  high: "bg-amber/15 text-amber border-amber/30",
  medium: "bg-blue/15 text-blue border-blue/30",
  low: "bg-text-dim/15 text-text-soft border-text-dim/30",
};

export default function HealthScan({ treeId }: Props) {
  const { data: tree } = useApiWithFallback<AgentTree>(
    () => fetchTree(treeId),
    mockTree,
    [treeId]
  );

  const { data: diagnostics } = useApiWithFallback<DiagnosticReport>(
    () => fetchDiagnostics(treeId),
    mockDiagnostics,
    [treeId]
  );

  const dimensions = useMemo(() => {
    if (!diagnostics.agents.length) return [];
    return Object.keys(diagnostics.agents[0].dimensions);
  }, [diagnostics]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link
            to="/trees"
            className="text-xs text-text-dim hover:text-text-soft transition-colors"
          >
            Trees
          </Link>
          <span className="text-text-dim/30">/</span>
          <Link
            to={`/trees/${treeId}`}
            className="text-xs text-text-dim hover:text-text-soft transition-colors"
          >
            {tree.name}
          </Link>
          <span className="text-text-dim/30">/</span>
          <span className="text-xs text-text-soft">Health Scan</span>
        </div>
        <h1 className="font-['Sora'] text-2xl font-semibold text-text">
          Health Scan
        </h1>
        <p className="text-sm text-text-soft mt-1">
          {tree.name} — Diagnostic Overview
        </p>
      </div>

      {/* Tree Visualizer */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <AgentTreeVisualizer agents={tree.agents} />
      </div>

      {/* Agent Score Cards */}
      <div>
        <h2 className="font-['Sora'] text-lg font-medium text-text mb-4">
          Agent Scores
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {diagnostics.agents.map((agent) => (
            <div
              key={agent.agent_id}
              className={clsx(
                "bg-surface border rounded-xl p-5 space-y-3",
                scoreBorder(agent.score)
              )}
              style={{ borderColor: `${scoreColor(agent.score)}30` }}
            >
              {/* Agent Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: agentColor(agent.agent_name) }}
                  />
                  <span className="font-['Sora'] font-medium text-text text-sm">
                    {agent.agent_name}
                  </span>
                </div>
                <span
                  className="font-['DM_Mono'] text-lg font-medium"
                  style={{ color: scoreColor(agent.score) }}
                >
                  {agent.score}%
                </span>
              </div>

              {/* Score delta */}
              <div className="flex items-center gap-2 text-xs text-text-soft">
                <span>was {agent.score_before}%</span>
                <span
                  className="font-['DM_Mono']"
                  style={{
                    color:
                      agent.score > agent.score_before
                        ? "#36d8a0"
                        : agent.score < agent.score_before
                        ? "#f06070"
                        : "#8888aa",
                  }}
                >
                  {agent.score > agent.score_before ? "+" : ""}
                  {agent.score - agent.score_before}pp
                </span>
              </div>

              {/* Dimension bars */}
              <div className="space-y-1.5">
                {dimensions.map((dim) => {
                  const val = agent.dimensions[dim] || 0;
                  return (
                    <div key={dim} className="flex items-center gap-2">
                      <span className="text-[10px] text-text-dim w-16 truncate capitalize">
                        {dim}
                      </span>
                      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${val}%`,
                            backgroundColor: scoreColor(val),
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-['DM_Mono'] text-text-dim w-7 text-right">
                        {val}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Issues */}
              {agent.issues.length > 0 && (
                <div className="pt-2 border-t border-border space-y-1">
                  {agent.issues.map((issue, i) => (
                    <p key={i} className="text-[11px] text-amber">
                      {issue}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Opportunities */}
      <div>
        <h2 className="font-['Sora'] text-lg font-medium text-text mb-4">
          Optimization Opportunities
        </h2>
        <div className="space-y-3">
          {diagnostics.opportunities.map((opp) => (
            <div
              key={opp.id}
              className="bg-surface border border-border rounded-xl p-5 flex items-start gap-4"
            >
              {/* Priority badge */}
              <span
                className={clsx(
                  "text-[10px] font-['DM_Mono'] uppercase px-2 py-0.5 rounded border shrink-0",
                  priorityStyles[opp.priority]
                )}
              >
                {opp.priority}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-text">{opp.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-text-dim">
                  <span
                    className="flex items-center gap-1"
                    style={{ color: agentColor(opp.agent_name) }}
                  >
                    {opp.agent_name}
                  </span>
                  <span
                    className="font-['DM_Mono'] px-1.5 py-0.5 rounded text-[10px]"
                    style={{
                      color: LEVEL_COLORS[opp.level],
                      backgroundColor: `${LEVEL_COLORS[opp.level]}15`,
                    }}
                  >
                    {opp.level} {LEVEL_LABELS[opp.level]}
                  </span>
                  <span className="text-text-dim">
                    ~{opp.estimated_impact}pp impact
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
