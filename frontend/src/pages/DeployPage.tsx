import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import clsx from "clsx";
import { scoreColor, agentColor } from "@/lib/constants";
import { mockTree, mockSession, mockDeployment } from "@/lib/mockData";
import type { Deployment } from "@/types";

type DeployStage = "configure" | "deploying" | "complete";

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-text-dim/10", text: "text-text-dim", label: "Pending" },
  canary: { bg: "bg-amber/10", text: "text-amber", label: "Canary" },
  rolling: { bg: "bg-blue/10", text: "text-blue", label: "Rolling Out" },
  complete: { bg: "bg-green/10", text: "text-green", label: "Complete" },
  rolled_back: { bg: "bg-red/10", text: "text-red", label: "Rolled Back" },
};

export default function DeployPage() {
  const [stage, setStage] = useState<DeployStage>("configure");
  const [canaryPercent, setCanaryPercent] = useState(10);
  const [deployStatus, setDeployStatus] = useState<Deployment["status"]>("pending");
  const [progress, setProgress] = useState(0);

  const handleDeploy = () => {
    setStage("deploying");
    setDeployStatus("canary");
    setProgress(0);

    // Simulate deployment stages
    const steps: Array<{ status: Deployment["status"]; progress: number; delay: number }> = [
      { status: "canary", progress: 25, delay: 1000 },
      { status: "canary", progress: 50, delay: 2000 },
      { status: "rolling", progress: 75, delay: 3000 },
      { status: "complete", progress: 100, delay: 4000 },
    ];

    steps.forEach(({ status, progress: p, delay }) => {
      setTimeout(() => {
        setDeployStatus(status);
        setProgress(p);
        if (status === "complete") {
          setStage("complete");
        }
      }, delay);
    });
  };

  const currentStatus = statusStyles[deployStatus] || statusStyles.pending;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-['Sora'] text-2xl font-semibold text-text">
          Deploy
        </h1>
        <p className="text-sm text-text-soft mt-1">
          Deploy optimized agent tree to production
        </p>
      </div>

      {/* Tree Summary */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-['Sora'] font-medium text-text">
              {mockTree.name}
            </h3>
            <p className="text-xs text-text-dim mt-0.5">
              Session: {mockSession.id}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-text-dim">Before</p>
              <p className="text-lg font-['DM_Mono'] text-text-dim">
                {mockSession.score_start}%
              </p>
            </div>
            <span className="text-text-dim">&rarr;</span>
            <div className="text-center">
              <p className="text-xs text-text-dim">After</p>
              <p
                className="text-lg font-['DM_Mono'] font-medium"
                style={{ color: scoreColor(mockSession.score_current) }}
              >
                {mockSession.score_current}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Configure Stage */}
      {stage === "configure" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Scope */}
          <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
            <h3 className="font-['Sora'] text-sm font-medium text-text">
              Deployment Scope
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {mockTree.agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-2 px-3 py-2.5 bg-void/50 rounded-lg border border-border"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: agentColor(agent.name) }}
                  />
                  <span className="text-sm text-text truncate">{agent.name}</span>
                  <span
                    className="text-[10px] font-['DM_Mono'] ml-auto shrink-0"
                    style={{ color: scoreColor(agent.score) }}
                  >
                    {agent.score}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Canary Config */}
          <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
            <h3 className="font-['Sora'] text-sm font-medium text-text">
              Canary Configuration
            </h3>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-text-dim uppercase tracking-wider font-['DM_Mono']">
                  Canary Percentage
                </label>
                <span className="text-sm font-['DM_Mono'] text-accent">
                  {canaryPercent}%
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                value={canaryPercent}
                onChange={(e) => setCanaryPercent(Number(e.target.value))}
                className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between text-[10px] text-text-dim mt-1">
                <span>1%</span>
                <span>50%</span>
              </div>
            </div>

            <div className="bg-void/50 border border-border rounded-lg p-4 text-xs text-text-soft space-y-1">
              <p>
                Canary will route {canaryPercent}% of traffic to the new
                configuration.
              </p>
              <p>
                Automatic rollback if score drops below{" "}
                {Math.round(mockSession.score_current * 0.95)}% (5% threshold).
              </p>
            </div>
          </div>

          {/* Deploy Button */}
          <button
            onClick={handleDeploy}
            className="w-full py-4 rounded-xl bg-accent text-void font-['Sora'] font-semibold text-sm hover:bg-accent/90 transition-colors"
          >
            Deploy with {canaryPercent}% Canary
          </button>
        </motion.div>
      )}

      {/* Deploying Stage */}
      {(stage === "deploying" || stage === "complete") && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Status */}
          <div className="bg-surface border border-border rounded-xl p-8 text-center space-y-6">
            <div>
              <span
                className={clsx(
                  "text-xs font-['DM_Mono'] uppercase px-3 py-1 rounded",
                  currentStatus.bg,
                  currentStatus.text
                )}
              >
                {currentStatus.label}
              </span>
            </div>

            {/* Progress */}
            <div className="max-w-md mx-auto">
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor:
                      deployStatus === "complete" ? "#36d8a0" : "#5b6af0",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-text-dim mt-2 font-['DM_Mono']">
                {progress}% complete
              </p>
            </div>

            {/* Stage Timeline */}
            <div className="flex items-center justify-center gap-2">
              {[
                { label: "Canary", status: "canary" },
                { label: "Rolling", status: "rolling" },
                { label: "Complete", status: "complete" },
              ].map((s, i) => {
                const reached =
                  ["canary", "rolling", "complete"].indexOf(deployStatus) >=
                  ["canary", "rolling", "complete"].indexOf(s.status);
                return (
                  <div key={s.status} className="flex items-center gap-2">
                    <div
                      className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-['DM_Mono'] border transition-colors",
                        reached
                          ? deployStatus === s.status
                            ? "bg-accent/15 border-accent/30 text-accent"
                            : "bg-green/15 border-green/30 text-green"
                          : "bg-void border-border text-text-dim"
                      )}
                    >
                      {reached && deployStatus !== s.status ? "\u2713" : i + 1}
                    </div>
                    <span
                      className={clsx(
                        "text-xs font-['Sora']",
                        reached ? "text-text" : "text-text-dim"
                      )}
                    >
                      {s.label}
                    </span>
                    {i < 2 && <div className="w-8 h-px bg-border mx-1" />}
                  </div>
                );
              })}
            </div>

            {stage === "complete" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-4 space-y-3"
              >
                <div className="inline-flex items-center gap-2 text-green text-lg font-['Sora'] font-semibold">
                  <span className="w-6 h-6 rounded-full bg-green/15 flex items-center justify-center text-sm">
                    &check;
                  </span>
                  Deployment Complete
                </div>
                <p className="text-sm text-text-soft">
                  {mockTree.name} is now live with a score of{" "}
                  <span className="text-green font-['DM_Mono']">
                    {mockSession.score_current}%
                  </span>
                  .
                </p>
                <div className="flex items-center justify-center gap-4 pt-2">
                  <Link
                    to="/"
                    className="px-4 py-2 rounded-lg text-xs font-['Sora'] font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                  >
                    Back to Briefing
                  </Link>
                  <Link
                    to="/trees"
                    className="px-4 py-2 rounded-lg text-xs font-['Sora'] font-medium text-text-soft hover:text-text transition-colors"
                  >
                    View Trees
                  </Link>
                </div>
              </motion.div>
            )}
          </div>

          {/* Canary Metrics */}
          {deployStatus !== "pending" && (
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="font-['Sora'] text-sm font-medium text-text mb-4">
                Live Metrics
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Canary Traffic", value: `${canaryPercent}%`, color: "#5b6af0" },
                  { label: "Canary Score", value: "89%", color: "#36d8a0" },
                  { label: "Error Rate", value: "0.12%", color: "#36d8a0" },
                  { label: "Latency P95", value: "1.8s", color: "#f0b040" },
                ].map((metric) => (
                  <div key={metric.label} className="text-center">
                    <p className="text-xs text-text-dim mb-1">{metric.label}</p>
                    <p
                      className="text-xl font-['DM_Mono'] font-medium"
                      style={{ color: metric.color }}
                    >
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
