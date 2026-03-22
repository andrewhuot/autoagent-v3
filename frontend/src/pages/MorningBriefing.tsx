import { useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { Link } from "react-router-dom";
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
import AgentTreeVisualizer from "@/components/AgentTreeVisualizer";
import RoutingFlow from "@/components/RoutingFlow";
import ConversationReplay from "@/components/ConversationReplay";
import {
  agentColor,
  scoreColor,
  LEVEL_LABELS,
  LEVEL_COLORS,
} from "@/lib/constants";
import { mockBriefingData } from "@/lib/mockData";
import { useApiWithFallback } from "@/hooks/useApi";
import { fetchBriefing } from "@/lib/api";
import type { BriefingData } from "@/types";

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.8,
      ease: "easeOut",
    });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, count, rounded]);

  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

export default function MorningBriefing() {
  const { data: briefing } = useApiWithFallback<BriefingData>(
    () => fetchBriefing("sess-1"),
    mockBriefingData
  );

  const [showReplay, setShowReplay] = useState(false);
  const [treeView, setTreeView] = useState<"before" | "after">("after");

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* ── Hero Section ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-surface border border-border p-10"
      >
        {/* Background gradient */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background:
              "radial-gradient(ellipse at 30% 50%, #5b6af020 0%, transparent 70%), radial-gradient(ellipse at 70% 50%, #36d8a015 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 text-center">
          <p className="text-xs text-text-dim uppercase tracking-widest mb-2 font-['DM_Mono']">
            Training Complete — {briefing.tree.name}
          </p>

          <div className="flex items-center justify-center gap-6 my-6">
            <div className="text-right">
              <p className="text-4xl font-['DM_Mono'] text-text-dim font-light">
                {briefing.score_start}%
              </p>
              <p className="text-[10px] text-text-dim uppercase tracking-wider mt-1">
                Start
              </p>
            </div>

            <div className="text-center">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
              >
                <p
                  className="text-7xl font-['Sora'] font-bold"
                  style={{
                    background: "linear-gradient(135deg, #36d8a0 0%, #5b6af0 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  +<AnimatedNumber value={briefing.improvement} suffix="%" />
                </p>
              </motion.div>
              <p className="text-xs text-text-soft mt-2">Overall Improvement</p>
            </div>

            <div className="text-left">
              <p className="text-4xl font-['DM_Mono'] text-green font-light">
                {briefing.score_end}%
              </p>
              <p className="text-[10px] text-text-dim uppercase tracking-wider mt-1">
                Current
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-4">
            <span className="text-xs text-text-dim">
              {briefing.session.total_waves} waves
            </span>
            <span className="text-text-dim/30">|</span>
            <span className="text-xs text-text-dim">
              {briefing.top_changes.length} experiments kept
            </span>
            <span className="text-text-dim/30">|</span>
            <span className="text-xs text-text-dim">
              {briefing.agent_stats.length} agents optimized
            </span>
          </div>
        </div>
      </motion.section>

      {/* ── Per-Agent Stats ── */}
      <section>
        <h2 className="font-['Sora'] text-lg font-medium text-text mb-4">
          Agent Performance
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {briefing.agent_stats.map((stat) => (
            <motion.div
              key={stat.agent_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface border border-border rounded-xl p-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: agentColor(stat.agent_name) }}
                />
                <span className="text-xs font-['Sora'] font-medium text-text truncate">
                  {stat.agent_name}
                </span>
              </div>

              <div className="flex items-end justify-between">
                <span
                  className="text-2xl font-['DM_Mono'] font-medium"
                  style={{ color: scoreColor(stat.score_after) }}
                >
                  {stat.score_after}%
                </span>
                <span
                  className="text-xs font-['DM_Mono']"
                  style={{
                    color: stat.delta > 0 ? "#36d8a0" : "#f06070",
                  }}
                >
                  {stat.delta > 0 ? "+" : ""}
                  {stat.delta}pp
                </span>
              </div>

              {/* Mini bar */}
              <div className="h-1 bg-border rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: `${stat.score_before}%` }}
                  animate={{ width: `${stat.score_after}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: scoreColor(stat.score_after) }}
                />
              </div>

              <p className="text-[10px] text-text-dim">
                {stat.experiments_applied} experiment
                {stat.experiments_applied !== 1 ? "s" : ""} applied
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Progress + Tree ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Chart */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="font-['Sora'] text-sm font-medium text-text mb-4">
            Score Progress by Wave
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={briefing.progress}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5b6af0" stopOpacity={0.3} />
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
                fill="url(#scoreGradient)"
                dot={{ fill: "#5b6af0", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, stroke: "#5b6af0", strokeWidth: 2, fill: "#0a0a1e" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tree Visualizer */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-['Sora'] text-sm font-medium text-text">
              Agent Tree
            </h3>
            <div className="flex items-center gap-1 bg-void rounded-lg p-0.5">
              {(["before", "after"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setTreeView(v)}
                  className={clsx(
                    "px-3 py-1 rounded-md text-[11px] font-['Sora'] transition-colors capitalize",
                    treeView === v
                      ? "bg-accent/15 text-accent"
                      : "text-text-dim hover:text-text-soft"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <AgentTreeVisualizer
            agents={briefing.tree.agents}
            showBefore={treeView === "before"}
            height={280}
          />
        </div>
      </section>

      {/* ── Routing Before/After ── */}
      <section className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-['Sora'] text-sm font-medium text-text">
              Routing Accuracy
            </h3>
            <p className="text-xs text-text-dim mt-0.5">
              Before and after training comparison
            </p>
          </div>
          <button
            onClick={() => setShowReplay(true)}
            className="text-xs text-accent hover:text-accent/80 font-['Sora'] font-medium transition-colors"
          >
            View Conversation Replay &rarr;
          </button>
        </div>
        <RoutingFlow data={briefing.routing} />
      </section>

      {/* ── Top Changes ── */}
      <section>
        <h2 className="font-['Sora'] text-lg font-medium text-text mb-4">
          Top Changes
        </h2>
        <div className="space-y-3">
          {briefing.top_changes.map((exp, i) => (
            <Link key={exp.id} to={`/experiments/${exp.id}`}>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4 hover:border-accent/30 transition-colors cursor-pointer"
            >
              {/* Rank */}
              <span className="text-lg font-['DM_Mono'] text-text-dim w-6 text-center">
                {i + 1}
              </span>

              {/* Score delta */}
              <div
                className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `${scoreColor(exp.score_after)}12`,
                  border: `1px solid ${scoreColor(exp.score_after)}30`,
                }}
              >
                <span
                  className="text-lg font-['DM_Mono'] font-medium"
                  style={{ color: scoreColor(exp.score_after) }}
                >
                  +{exp.score_after - exp.score_before}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text font-['Sora'] font-medium truncate">
                  {exp.hypothesis}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span
                    className="text-xs flex items-center gap-1"
                    style={{ color: agentColor(exp.target_agent_name) }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: agentColor(exp.target_agent_name),
                      }}
                    />
                    {exp.target_agent_name}
                  </span>
                  <span
                    className="text-[10px] font-['DM_Mono'] px-1.5 py-0.5 rounded"
                    style={{
                      color: LEVEL_COLORS[exp.level],
                      backgroundColor: `${LEVEL_COLORS[exp.level]}15`,
                    }}
                  >
                    {exp.level} {LEVEL_LABELS[exp.level]}
                  </span>
                  <span
                    className={`text-[10px] font-['DM_Mono'] px-1.5 py-0.5 rounded ${
                      exp.status === "kept"
                        ? "bg-green/10 text-green"
                        : "bg-red/10 text-red"
                    }`}
                  >
                    {exp.status}
                  </span>
                </div>
              </div>

              {/* Scores */}
              <div className="text-right shrink-0">
                <div className="flex items-center gap-2 text-sm font-['DM_Mono']">
                  <span className="text-text-dim">{exp.score_before}%</span>
                  <span className="text-text-dim/30">&rarr;</span>
                  <span style={{ color: scoreColor(exp.score_after) }}>
                    {exp.score_after}%
                  </span>
                </div>
              </div>
            </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Cross-Tree Summary ── */}
      {briefing.cross_tree_summary.length > 0 && (
        <section className="bg-surface border border-border rounded-xl p-6">
          <h3 className="font-['Sora'] text-sm font-medium text-text mb-4">
            Cross-Tree Validation
          </h3>
          <div className="space-y-2">
            {briefing.cross_tree_summary.map((ct) => (
              <div
                key={ct.tree_id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-void/50"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      ct.validation_status === "pass" ? "bg-green" : "bg-red"
                    }`}
                  />
                  <span className="text-sm text-text">{ct.tree_name}</span>
                  <span className="text-xs text-teal">{ct.shared_agent}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-['DM_Mono'] ${
                      ct.score_delta >= 0 ? "text-green" : "text-red"
                    }`}
                  >
                    {ct.score_delta >= 0 ? "+" : ""}
                    {ct.score_delta}pp
                  </span>
                  <span
                    className={`text-[10px] font-['DM_Mono'] px-2 py-0.5 rounded uppercase ${
                      ct.validation_status === "pass"
                        ? "bg-green/10 text-green"
                        : "bg-red/10 text-red"
                    }`}
                  >
                    {ct.validation_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Deploy CTA ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative overflow-hidden rounded-2xl border border-accent/20 p-8 text-center"
        style={{
          background: "linear-gradient(135deg, #5b6af008 0%, #36d8a008 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at center, #5b6af015 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10">
          <h3 className="font-['Sora'] text-xl font-semibold text-text">
            Ready to Deploy
          </h3>
          <p className="text-sm text-text-soft mt-2 max-w-md mx-auto">
            {briefing.tree.name} scored {briefing.score_end}% — a{" "}
            {briefing.improvement}pp improvement. All cross-tree validations
            passed.
          </p>
          <Link
            to="/deploy"
            className="inline-flex items-center gap-2 mt-6 px-8 py-3 rounded-xl bg-accent text-void font-['Sora'] font-semibold text-sm hover:bg-accent/90 transition-colors"
          >
            Approve &amp; Deploy
            <span>&rarr;</span>
          </Link>
        </div>
      </motion.section>

      {/* Conversation Replay Modal */}
      <ConversationReplay
        isOpen={showReplay}
        onClose={() => setShowReplay(false)}
        title="Billing Inquiry — Before vs After"
      />
    </div>
  );
}
