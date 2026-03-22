import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { agentColor, scoreColor } from "@/lib/constants";
import type { RoutingData, RoutingPath } from "@/types";

interface Props {
  data: RoutingData;
}

function RoutingBar({ path, phase }: { path: RoutingPath; phase: "before" | "after" }) {
  const steps = phase === "before" ? path.before : path.after;
  const total = steps.reduce((sum, s) => sum + s.count, 0);
  const accuracy = phase === "before" ? path.accuracy_before : path.accuracy_after;

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div className="flex h-7 rounded-lg overflow-hidden bg-border/30">
        {steps.map((step, i) => {
          const pct = (step.count / total) * 100;
          if (pct < 1) return null;
          return (
            <motion.div
              key={`${step.agent}-${i}`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
              className="flex items-center justify-center text-[10px] font-['DM_Mono'] text-void font-medium relative group"
              style={{
                backgroundColor: step.correct
                  ? agentColor(step.agent)
                  : "#f06070",
              }}
            >
              {pct > 12 && (
                <span className="truncate px-1">
                  {step.agent.replace("Agent", "")}
                </span>
              )}
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-void border border-border rounded-lg px-3 py-2 text-text text-[11px] whitespace-nowrap z-10 shadow-lg">
                <p className="font-['Sora'] font-medium">{step.agent}</p>
                <p className="text-text-dim mt-0.5">
                  {step.count} routes ({Math.round(pct)}%)
                </p>
                <p className={step.correct ? "text-green" : "text-red"}>
                  {step.correct ? "Correct" : "Misrouted"}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          {steps.map((step, i) => (
            <span
              key={i}
              className="flex items-center gap-1 text-[10px] text-text-dim"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: step.correct
                    ? agentColor(step.agent)
                    : "#f06070",
                }}
              />
              {step.agent.replace("Agent", "")} ({step.count})
            </span>
          ))}
        </div>
        <span
          className="font-['DM_Mono'] text-sm font-medium"
          style={{ color: scoreColor(accuracy) }}
        >
          {accuracy}%
        </span>
      </div>
    </div>
  );
}

export default function RoutingFlow({ data }: Props) {
  const [activePhase, setActivePhase] = useState<"both" | "before" | "after">("both");

  return (
    <div className="space-y-6">
      {/* Phase Toggle */}
      <div className="flex items-center gap-2">
        {(["both", "before", "after"] as const).map((phase) => (
          <button
            key={phase}
            onClick={() => setActivePhase(phase)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-['Sora'] font-medium transition-colors capitalize",
              activePhase === phase
                ? "bg-accent/15 text-accent border border-accent/30"
                : "text-text-dim hover:text-text-soft border border-transparent"
            )}
          >
            {phase === "both" ? "Compare" : phase}
          </button>
        ))}
      </div>

      {/* Routing Paths */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activePhase}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="space-y-6"
        >
          {data.paths.map((path) => (
            <div key={path.intent} className="space-y-3">
              <h4 className="font-['Sora'] text-sm font-medium text-text capitalize">
                {path.intent.replace(/_/g, " ")}
              </h4>

              {activePhase === "both" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-text-dim uppercase tracking-wider mb-2">
                      Before
                    </p>
                    <RoutingBar path={path} phase="before" />
                  </div>
                  <div>
                    <p className="text-[10px] text-text-dim uppercase tracking-wider mb-2">
                      After
                    </p>
                    <RoutingBar path={path} phase="after" />
                  </div>
                </div>
              ) : (
                <RoutingBar path={path} phase={activePhase} />
              )}
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
