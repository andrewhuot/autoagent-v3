import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import AgentTreeVisualizer from "@/components/AgentTreeVisualizer";
import { agentColor, scoreColor, LEVEL_LABELS } from "@/lib/constants";
import { mockTree } from "@/lib/mockData";
import { useApiWithFallback } from "@/hooks/useApi";
import { fetchTree } from "@/lib/api";
import type { Agent, AgentTree } from "@/types";

export default function TreeDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: tree } = useApiWithFallback<AgentTree>(
    () => fetchTree(id || "tree-1"),
    mockTree,
    [id]
  );

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/trees"
              className="text-xs text-text-dim hover:text-text-soft transition-colors"
            >
              Trees
            </Link>
            <span className="text-text-dim/30">/</span>
          </div>
          <h1 className="font-['Sora'] text-2xl font-semibold text-text">
            {tree.name}
          </h1>
          <p className="text-sm text-text-soft mt-1">{tree.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to={`/health/${tree.id}`}
            className="px-4 py-2 rounded-lg text-xs font-['Sora'] font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
          >
            Health Scan
          </Link>
          <div className="text-right">
            <p
              className="text-2xl font-['DM_Mono'] font-medium"
              style={{ color: scoreColor(tree.score) }}
            >
              {tree.score}%
            </p>
            <p className="text-[10px] text-text-dim">
              from {tree.score_before}%
            </p>
          </div>
        </div>
      </div>

      {/* Visualizer + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tree */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-6">
          <h3 className="font-['Sora'] text-sm font-medium text-text mb-4">
            Agent Tree
          </h3>
          <AgentTreeVisualizer
            agents={tree.agents}
            selectedId={selectedAgent?.id}
            onSelect={setSelectedAgent}
            height={380}
          />
        </div>

        {/* Detail Panel */}
        <div className="bg-surface border border-border rounded-xl p-6">
          {selectedAgent ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: agentColor(selectedAgent.name),
                  }}
                />
                <h3 className="font-['Sora'] text-lg font-medium text-text">
                  {selectedAgent.name}
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">
                    Role
                  </p>
                  <p className="text-sm text-text capitalize">
                    {selectedAgent.role}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">
                    Model
                  </p>
                  <p className="text-sm text-text font-['DM_Mono']">
                    {selectedAgent.model}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">
                    Score
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-2xl font-['DM_Mono'] font-medium"
                      style={{
                        color: scoreColor(selectedAgent.score),
                      }}
                    >
                      {selectedAgent.score}%
                    </span>
                    <span className="text-xs text-text-dim">
                      from {selectedAgent.score_before}%
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">
                    Tools
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAgent.tools.map((tool) => (
                      <span
                        key={tool}
                        className="text-[10px] font-['DM_Mono'] px-2 py-0.5 rounded bg-void border border-border text-text-soft"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedAgent.is_shared && (
                  <div className="flex items-center gap-2 text-xs text-teal bg-teal/5 border border-teal/20 rounded-lg px-3 py-2">
                    <span className="w-2 h-2 rounded-full bg-teal" />
                    Shared Library Agent
                  </div>
                )}

                <div>
                  <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1">
                    Instruction
                  </p>
                  <p className="text-xs text-text-soft bg-void/50 border border-border rounded-lg p-3 font-['DM_Mono'] leading-relaxed">
                    {selectedAgent.instruction}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-12 h-12 rounded-full bg-void border border-border flex items-center justify-center mb-3">
                <span className="text-text-dim text-lg">&larr;</span>
              </div>
              <p className="text-sm text-text-soft">
                Select an agent node to view details
              </p>
              <p className="text-xs text-text-dim mt-1">
                Click any node in the tree
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Agent List */}
      <div>
        <h3 className="font-['Sora'] text-sm font-medium text-text mb-3">
          All Agents
        </h3>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface text-text-dim text-xs font-['DM_Mono'] uppercase">
                <th className="text-left px-4 py-2.5">Agent</th>
                <th className="text-left px-4 py-2.5">Role</th>
                <th className="text-left px-4 py-2.5">Model</th>
                <th className="text-right px-4 py-2.5">Score</th>
                <th className="text-right px-4 py-2.5">Delta</th>
              </tr>
            </thead>
            <tbody>
              {tree.agents.map((agent) => {
                const delta = agent.score - agent.score_before;
                return (
                  <tr
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className="border-t border-border hover:bg-void/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: agentColor(agent.name),
                          }}
                        />
                        <span className="text-text">{agent.name}</span>
                        {agent.is_shared && (
                          <span className="text-[9px] font-['DM_Mono'] text-teal bg-teal/10 px-1.5 py-0.5 rounded">
                            shared
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-dim capitalize">
                      {agent.role}
                    </td>
                    <td className="px-4 py-3 text-text-dim font-['DM_Mono'] text-xs">
                      {agent.model}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="font-['DM_Mono']"
                        style={{ color: scoreColor(agent.score) }}
                      >
                        {agent.score}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="font-['DM_Mono'] text-xs"
                        style={{
                          color:
                            delta > 0
                              ? "#36d8a0"
                              : delta < 0
                              ? "#f06070"
                              : "#8888aa",
                        }}
                      >
                        {delta > 0 ? "+" : ""}
                        {delta}pp
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
