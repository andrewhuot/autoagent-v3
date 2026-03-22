import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import clsx from "clsx";
import {
  agentColor,
  scoreColor,
  LEVEL_LABELS,
  LEVEL_COLORS,
} from "@/lib/constants";
import { mockSession } from "@/lib/mockData";
import { useApiWithFallback } from "@/hooks/useApi";
import { fetchSession } from "@/lib/api";
import type { TrainingSession, WaveData, Experiment } from "@/types";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    complete: "bg-green/10 text-green",
    running: "bg-accent/10 text-accent",
    pending: "bg-text-dim/10 text-text-dim",
    kept: "bg-green/10 text-green",
    reverted: "bg-red/10 text-red",
    error: "bg-red/10 text-red",
    failed: "bg-red/10 text-red",
    paused: "bg-amber/10 text-amber",
    initializing: "bg-blue/10 text-blue",
  };

  return (
    <span
      className={clsx(
        "text-[10px] font-['DM_Mono'] uppercase px-2 py-0.5 rounded",
        styles[status] || "bg-text-dim/10 text-text-dim"
      )}
    >
      {status}
    </span>
  );
}

function ExperimentCard({ exp }: { exp: Experiment }) {
  const delta = exp.score_after - exp.score_before;

  return (
    <Link to={`/experiments/${exp.id}`} className="block">
    <div className="bg-void/50 border border-border rounded-lg p-4 space-y-2 hover:border-accent/30 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: agentColor(exp.target_agent_name) }}
          />
          <span className="text-xs font-['Sora'] font-medium text-text">
            {exp.target_agent_name}
          </span>
          <span
            className="text-[10px] font-['DM_Mono'] px-1.5 py-0.5 rounded"
            style={{
              color: LEVEL_COLORS[exp.level],
              backgroundColor: `${LEVEL_COLORS[exp.level]}15`,
            }}
          >
            {exp.level}
          </span>
        </div>
        <StatusBadge status={exp.status} />
      </div>

      <p className="text-sm text-text-soft">{exp.hypothesis}</p>

      <div className="flex items-center gap-3 text-xs font-['DM_Mono']">
        <span className="text-text-dim">{exp.score_before}%</span>
        <span className="text-text-dim/30">&rarr;</span>
        <span style={{ color: scoreColor(exp.score_after) }}>
          {exp.score_after}%
        </span>
        <span
          style={{ color: delta >= 0 ? "#36d8a0" : "#f06070" }}
        >
          ({delta >= 0 ? "+" : ""}{delta}pp)
        </span>
      </div>
    </div>
    </Link>
  );
}

function WavePanel({ wave, isActive }: { wave: WaveData; isActive: boolean }) {
  const [expanded, setExpanded] = useState(isActive);

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-void/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-['Sora'] font-medium text-text">
            Wave {wave.wave}
          </span>
          <StatusBadge status={wave.status} />
          <span className="text-xs text-text-dim">
            {wave.experiments.length} experiments
          </span>
        </div>
        <span className="text-text-dim text-sm">
          {expanded ? "\u25B2" : "\u25BC"}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 space-y-3">
              {wave.experiments.map((exp) => (
                <ExperimentCard key={exp.id} exp={exp} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TrainingLiveView() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useApiWithFallback<TrainingSession>(
    () => fetchSession(id || "sess-1"),
    mockSession,
    [id]
  );

  const researchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (researchRef.current) {
      researchRef.current.scrollTop = researchRef.current.scrollHeight;
    }
  }, [session.research_memory?.entries]);

  const progressData = session.waves.map((w) => {
    const keptExps = w.experiments.filter((e) => e.status === "kept");
    const avgScore =
      keptExps.length > 0
        ? keptExps.reduce((s, e) => s + e.score_after, 0) / keptExps.length
        : session.score_start;
    return {
      wave: w.wave,
      score: Math.round(avgScore),
    };
  });

  progressData.unshift({ wave: 0, score: session.score_start });

  const entryTypeStyles: Record<string, string> = {
    observation: "text-blue",
    hypothesis: "text-purple",
    result: "text-green",
    decision: "text-amber",
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Sora'] text-2xl font-semibold text-text">
            Training Session
          </h1>
          <p className="text-sm text-text-soft mt-1">
            {session.tree_name} — {session.id}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={session.status} />
          <div className="text-right">
            <p className="text-2xl font-['DM_Mono'] text-green font-medium">
              {session.score_current}%
            </p>
            <p className="text-[10px] text-text-dim">
              from {session.score_start}%
            </p>
          </div>
        </div>
      </div>

      {/* Progress Chart */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="font-['Sora'] text-sm font-medium text-text mb-4">
          Score Progress
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={progressData}>
            <defs>
              <linearGradient id="trainGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5b6af0" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#5b6af0" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#161640" />
            <XAxis
              dataKey="wave"
              stroke="#444466"
              tick={{ fill: "#8888aa", fontSize: 11, fontFamily: "'DM Mono'" }}
              tickFormatter={(w) => `W${w}`}
            />
            <YAxis
              domain={[40, 100]}
              stroke="#444466"
              tick={{ fill: "#8888aa", fontSize: 11, fontFamily: "'DM Mono'" }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "#0a0a1e",
                border: "1px solid #161640",
                borderRadius: 8,
                fontFamily: "'DM Mono'",
                fontSize: 12,
              }}
              labelFormatter={(w) => `Wave ${w}`}
              formatter={(value: number) => [`${value}%`, "Score"]}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#5b6af0"
              strokeWidth={2}
              fill="url(#trainGradient)"
              dot={{ fill: "#5b6af0", r: 4, strokeWidth: 0 }}
              activeDot={{
                r: 6,
                stroke: "#5b6af0",
                strokeWidth: 2,
                fill: "#0a0a1e",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Waves */}
      <div className="space-y-3">
        <h3 className="font-['Sora'] text-sm font-medium text-text">
          Wave Timeline
        </h3>
        {session.waves.map((wave) => (
          <WavePanel
            key={wave.wave}
            wave={wave}
            isActive={wave.wave === session.current_wave}
          />
        ))}
      </div>

      {/* Research Status Stream */}
      {session.research_memory && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="font-['Sora'] text-sm font-medium text-text mb-4">
            Research Log
          </h3>
          <div
            ref={researchRef}
            className="max-h-80 overflow-y-auto space-y-2 pr-2"
          >
            {session.research_memory.entries.map((entry, i) => (
              <div key={i} className="flex gap-3 py-1.5">
                <span
                  className={clsx(
                    "text-[10px] font-['DM_Mono'] uppercase w-20 shrink-0 pt-0.5",
                    entryTypeStyles[entry.type] || "text-text-dim"
                  )}
                >
                  {entry.type}
                </span>
                <p className="text-sm text-text-soft leading-relaxed">
                  {entry.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
