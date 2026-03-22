import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import {
  agentColor,
  scoreColor,
  LEVEL_LABELS,
  LEVEL_COLORS,
} from "@/lib/constants";
import { mockExperiments } from "@/lib/mockData";
import { useApiWithFallback } from "@/hooks/useApi";
import { fetchExperiment } from "@/lib/api";
import type { Experiment } from "@/types";

function ConfigDiff({ diff }: { diff: Record<string, unknown> }) {
  const renderValue = (val: unknown, indent: number = 0): string => {
    if (typeof val === "string") return `"${val}"`;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (Array.isArray(val)) return `[${val.map((v) => renderValue(v)).join(", ")}]`;
    if (val && typeof val === "object") {
      const entries = Object.entries(val as Record<string, unknown>);
      const pad = "  ".repeat(indent + 1);
      const lines = entries.map(([k, v]) => `${pad}${k}: ${renderValue(v, indent + 1)}`);
      return `{\n${lines.join(",\n")}\n${"  ".repeat(indent)}}`;
    }
    return String(val);
  };

  return (
    <div className="space-y-3">
      {Object.entries(diff).map(([key, value]) => {
        const val = value as Record<string, unknown>;
        const hasBefore = val && typeof val === "object" && "before" in val;

        return (
          <div key={key}>
            <p className="text-xs text-text-soft font-['Sora'] font-medium mb-1.5">
              {key}
            </p>
            {hasBefore ? (
              <div className="space-y-1.5">
                <div className="bg-red/5 border border-red/10 rounded-lg p-3">
                  <p className="text-[10px] text-red font-['DM_Mono'] mb-1">
                    - before
                  </p>
                  <pre className="text-xs text-text-soft font-['DM_Mono'] whitespace-pre-wrap break-all">
                    {renderValue(val.before, 1)}
                  </pre>
                </div>
                <div className="bg-green/5 border border-green/10 rounded-lg p-3">
                  <p className="text-[10px] text-green font-['DM_Mono'] mb-1">
                    + after
                  </p>
                  <pre className="text-xs text-text-soft font-['DM_Mono'] whitespace-pre-wrap break-all">
                    {renderValue(val.after, 1)}
                  </pre>
                </div>
              </div>
            ) : (
              <pre className="bg-void/50 border border-border rounded-lg p-3 text-xs text-text-soft font-['DM_Mono'] whitespace-pre-wrap break-all">
                {renderValue(value, 1)}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ExperimentDetail() {
  const { id } = useParams<{ id: string }>();

  const fallback = mockExperiments.find((e) => e.id === id) || mockExperiments[0];
  const { data: experiment } = useApiWithFallback<Experiment>(
    () => fetchExperiment(id || "exp-1"),
    fallback,
    [id]
  );

  const radarData = useMemo(
    () =>
      Object.entries(experiment.per_dimension_scores).map(([dim, scores]) => ({
        dimension: dim.charAt(0).toUpperCase() + dim.slice(1),
        before: scores.before,
        after: scores.after,
      })),
    [experiment]
  );

  const barData = useMemo(
    () =>
      Object.entries(experiment.per_agent_scores).map(([name, scores]) => ({
        agent: name,
        delta: scores.after - scores.before,
        before: scores.before,
        after: scores.after,
      })),
    [experiment]
  );

  const delta = experiment.score_after - experiment.score_before;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Link
            to="/"
            className="text-xs text-text-dim hover:text-text-soft transition-colors"
          >
            Briefing
          </Link>
          <span className="text-text-dim/30">/</span>
          <span className="text-xs text-text-soft">Experiment</span>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: agentColor(experiment.target_agent_name),
            }}
          />
          <h1 className="font-['Sora'] text-2xl font-semibold text-text">
            {experiment.hypothesis}
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="text-xs font-['DM_Mono'] px-2 py-0.5 rounded"
            style={{
              color: LEVEL_COLORS[experiment.level],
              backgroundColor: `${LEVEL_COLORS[experiment.level]}15`,
            }}
          >
            {experiment.level} {LEVEL_LABELS[experiment.level]}
          </span>
          <span
            className="text-xs flex items-center gap-1"
            style={{ color: agentColor(experiment.target_agent_name) }}
          >
            {experiment.target_agent_name}
          </span>
          <span
            className={`text-[10px] font-['DM_Mono'] px-2 py-0.5 rounded uppercase ${
              experiment.status === "kept"
                ? "bg-green/10 text-green"
                : experiment.status === "reverted"
                ? "bg-red/10 text-red"
                : "bg-text-dim/10 text-text-dim"
            }`}
          >
            {experiment.status}
          </span>
          <span className="text-xs text-text-dim">Wave {experiment.wave}</span>
        </div>
      </div>

      {/* Rationale */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="font-['Sora'] text-sm font-medium text-text mb-2">
          Rationale
        </h3>
        <p className="text-sm text-text-soft leading-relaxed">
          {experiment.rationale}
        </p>
      </div>

      {/* Score Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-6 text-center">
          <p className="text-xs text-text-dim uppercase tracking-wider mb-2">
            Before
          </p>
          <p className="text-3xl font-['DM_Mono'] text-text-dim">
            {experiment.score_before}%
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-6 text-center">
          <p className="text-xs text-text-dim uppercase tracking-wider mb-2">
            Delta
          </p>
          <p
            className="text-3xl font-['DM_Mono'] font-medium"
            style={{ color: delta >= 0 ? "#36d8a0" : "#f06070" }}
          >
            {delta >= 0 ? "+" : ""}
            {delta}pp
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-6 text-center">
          <p className="text-xs text-text-dim uppercase tracking-wider mb-2">
            After
          </p>
          <p
            className="text-3xl font-['DM_Mono'] font-medium"
            style={{ color: scoreColor(experiment.score_after) }}
          >
            {experiment.score_after}%
          </p>
        </div>
      </div>

      {/* Blast Radius */}
      {experiment.blast_radius.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="font-['Sora'] text-sm font-medium text-text mb-3">
            Blast Radius
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {experiment.blast_radius.map((agent) => (
              <span
                key={agent}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border"
                style={{
                  color: agentColor(agent),
                  borderColor: `${agentColor(agent)}30`,
                  backgroundColor: `${agentColor(agent)}08`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: agentColor(agent) }}
                />
                {agent}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="font-['Sora'] text-sm font-medium text-text mb-4">
            Per-Dimension Scores
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#161640" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{
                  fill: "#8888aa",
                  fontSize: 11,
                  fontFamily: "'DM Mono'",
                }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{
                  fill: "#444466",
                  fontSize: 9,
                  fontFamily: "'DM Mono'",
                }}
              />
              <Radar
                name="Before"
                dataKey="before"
                stroke="#f06070"
                fill="#f06070"
                fillOpacity={0.1}
                strokeWidth={1.5}
              />
              <Radar
                name="After"
                dataKey="after"
                stroke="#36d8a0"
                fill="#36d8a0"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Legend
                wrapperStyle={{
                  fontFamily: "'DM Mono'",
                  fontSize: 11,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="font-['Sora'] text-sm font-medium text-text mb-4">
            Per-Agent Score Delta
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#161640"
                horizontal={false}
              />
              <XAxis
                type="number"
                stroke="#444466"
                tick={{
                  fill: "#8888aa",
                  fontSize: 11,
                  fontFamily: "'DM Mono'",
                }}
                tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`}
              />
              <YAxis
                type="category"
                dataKey="agent"
                stroke="#444466"
                tick={{
                  fill: "#8888aa",
                  fontSize: 10,
                  fontFamily: "'DM Mono'",
                }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  background: "#0a0a1e",
                  border: "1px solid #161640",
                  borderRadius: 8,
                  fontFamily: "'DM Mono'",
                  fontSize: 12,
                }}
                formatter={(value: number) => [
                  `${value > 0 ? "+" : ""}${value}pp`,
                  "Delta",
                ]}
              />
              <Bar dataKey="delta" radius={[0, 4, 4, 0]}>
                {barData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.delta >= 0 ? "#36d8a0" : "#f06070"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Config Diff */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="font-['Sora'] text-sm font-medium text-text mb-4">
          Configuration Changes
        </h3>
        <ConfigDiff diff={experiment.config_diff} />
      </div>

      {/* Cross-Tree Results */}
      {experiment.cross_tree_results.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="font-['Sora'] text-sm font-medium text-text mb-4">
            Cross-Tree Impact
          </h3>
          <div className="space-y-2">
            {experiment.cross_tree_results.map((ct) => (
              <div
                key={ct.tree_id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-void/50"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      ct.status === "pass" ? "bg-green" : "bg-red"
                    }`}
                  />
                  <span className="text-sm text-text">{ct.tree_name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-['DM_Mono']">
                  <span className="text-text-dim">
                    {ct.score_before}% &rarr; {ct.score_after}%
                  </span>
                  <span
                    className={
                      ct.status === "pass" ? "text-green" : "text-red"
                    }
                  >
                    {ct.status === "pass" ? "PASS" : "REGRESSION"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
