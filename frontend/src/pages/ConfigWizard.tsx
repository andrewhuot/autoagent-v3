import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { LEVEL_LABELS, LEVEL_COLORS, agentColor } from "@/lib/constants";
import { mockTree, mockAgents } from "@/lib/mockData";

const STEPS = [
  { id: 1, label: "Import Tree" },
  { id: 2, label: "Tag Shared" },
  { id: 3, label: "Review Evals" },
  { id: 4, label: "Set Scope" },
];

const mockEvals = [
  { id: "eval-1", name: "Billing accuracy", dimension: "accuracy", enabled: true },
  { id: "eval-2", name: "Refund eligibility check", dimension: "safety", enabled: true },
  { id: "eval-3", name: "Routing correctness", dimension: "accuracy", enabled: true },
  { id: "eval-4", name: "Response helpfulness", dimension: "helpfulness", enabled: true },
  { id: "eval-5", name: "Latency budget (< 2s)", dimension: "latency", enabled: false },
  { id: "eval-6", name: "Cost efficiency", dimension: "cost", enabled: false },
  { id: "eval-7", name: "Escalation appropriateness", dimension: "safety", enabled: true },
  { id: "eval-8", name: "Auth MFA compliance", dimension: "safety", enabled: true },
];

export default function ConfigWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [importPath, setImportPath] = useState("");
  const [sharedAgents, setSharedAgents] = useState<Set<string>>(
    new Set(mockAgents.filter((a) => a.is_shared).map((a) => a.id))
  );
  const [evals, setEvals] = useState(mockEvals);
  const [scope, setScope] = useState<Set<string>>(
    new Set(["L1", "L2", "L3"])
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleShared = (id: string) => {
    setSharedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleEval = (id: string) => {
    setEvals((prev) =>
      prev.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e))
    );
  };

  const toggleScope = (level: string) => {
    setScope((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  const handleStart = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      navigate("/training/sess-1");
    }, 1200);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-['Sora'] text-2xl font-semibold text-text">
          Configuration Wizard
        </h1>
        <p className="text-sm text-text-soft mt-1">
          Set up a new training session
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => setStep(s.id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-['Sora'] font-medium transition-all w-full justify-center",
                step === s.id
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : step > s.id
                  ? "bg-green/10 text-green border border-green/20"
                  : "text-text-dim border border-border hover:text-text-soft"
              )}
            >
              <span className="font-['DM_Mono'] text-[10px]">{s.id}</span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && (
              <div className="w-4 h-px bg-border shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.15 }}
          className="bg-surface border border-border rounded-xl p-8"
        >
          {/* Step 1: Import Tree */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-['Sora'] text-lg font-medium text-text">
                  Import Agent Tree
                </h2>
                <p className="text-sm text-text-soft mt-1">
                  Provide the path or URL to your agent tree configuration.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-text-dim uppercase tracking-wider font-['DM_Mono']">
                  Tree Path / URL
                </label>
                <input
                  type="text"
                  value={importPath}
                  onChange={(e) => setImportPath(e.target.value)}
                  placeholder="./configs/customer-support-v3.yaml"
                  className="w-full bg-void border border-border rounded-lg px-4 py-3 text-sm text-text placeholder-text-dim focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>

              <div className="bg-void/50 border border-border rounded-lg p-4">
                <p className="text-xs text-text-soft mb-2">
                  Preview: {mockTree.name}
                </p>
                <div className="flex items-center gap-4 text-xs text-text-dim">
                  <span>{mockTree.agents.length} agents</span>
                  <span>{mockTree.score}% current score</span>
                  <span className="capitalize">{mockTree.status}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Tag Shared Agents */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-['Sora'] text-lg font-medium text-text">
                  Tag Shared Agents
                </h2>
                <p className="text-sm text-text-soft mt-1">
                  Mark agents that are shared across multiple trees for L4
                  cross-tree validation.
                </p>
              </div>

              <div className="space-y-2">
                {mockAgents.map((agent) => (
                  <label
                    key={agent.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-border/80 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={sharedAgents.has(agent.id)}
                      onChange={() => toggleShared(agent.id)}
                      className="w-4 h-4 rounded border-border accent-teal"
                    />
                    <div className="flex-1 flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: agentColor(agent.name) }}
                      />
                      <span className="text-sm text-text">{agent.name}</span>
                      <span className="text-[10px] text-text-dim capitalize">
                        {agent.role}
                      </span>
                    </div>
                    {sharedAgents.has(agent.id) && (
                      <span className="text-[10px] font-['DM_Mono'] text-teal bg-teal/10 px-2 py-0.5 rounded">
                        shared
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Review Eval Suite */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-['Sora'] text-lg font-medium text-text">
                  Review Eval Suite
                </h2>
                <p className="text-sm text-text-soft mt-1">
                  Enable or disable evaluation cases for this training run.
                </p>
              </div>

              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-void/50 text-text-dim text-xs font-['DM_Mono'] uppercase">
                      <th className="text-left px-4 py-2.5">Eval</th>
                      <th className="text-left px-4 py-2.5">Dimension</th>
                      <th className="text-center px-4 py-2.5">Enabled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evals.map((ev) => (
                      <tr
                        key={ev.id}
                        className="border-t border-border hover:bg-void/20 transition-colors"
                      >
                        <td className="px-4 py-3 text-text">{ev.name}</td>
                        <td className="px-4 py-3 text-text-dim capitalize text-xs font-['DM_Mono']">
                          {ev.dimension}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleEval(ev.id)}
                            className={clsx(
                              "w-10 h-5 rounded-full transition-colors relative",
                              ev.enabled ? "bg-green/30" : "bg-border"
                            )}
                          >
                            <span
                              className={clsx(
                                "absolute top-0.5 w-4 h-4 rounded-full transition-all",
                                ev.enabled
                                  ? "left-5.5 bg-green"
                                  : "left-0.5 bg-text-dim"
                              )}
                              style={{
                                left: ev.enabled ? "22px" : "2px",
                              }}
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 4: Set Scope */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-['Sora'] text-lg font-medium text-text">
                  Optimization Scope
                </h2>
                <p className="text-sm text-text-soft mt-1">
                  Select which optimization levels to enable for this training
                  session.
                </p>
              </div>

              <div className="space-y-3">
                {Object.entries(LEVEL_LABELS).map(([level, label]) => (
                  <label
                    key={level}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-border/80 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={scope.has(level)}
                      onChange={() => toggleScope(level)}
                      className="w-4 h-4 rounded border-border accent-accent"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-['DM_Mono'] font-medium px-2 py-0.5 rounded"
                          style={{
                            color: LEVEL_COLORS[level],
                            backgroundColor: `${LEVEL_COLORS[level]}15`,
                          }}
                        >
                          {level}
                        </span>
                        <span className="text-sm text-text font-['Sora'] font-medium">
                          {label}
                        </span>
                      </div>
                      <p className="text-xs text-text-dim mt-1">
                        {level === "L1" && "Modify agent system prompts and instructions"}
                        {level === "L2" && "Adjust tool configurations and parameters"}
                        {level === "L3" && "Optimize routing logic and handoff rules"}
                        {level === "L4" && "Update shared library agents (cross-tree impact)"}
                        {level === "L5" && "Restructure agent tree architecture"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              <button
                onClick={handleStart}
                disabled={scope.size === 0 || isSubmitting}
                className={clsx(
                  "w-full py-3.5 rounded-xl font-['Sora'] font-semibold text-sm transition-all",
                  scope.size > 0 && !isSubmitting
                    ? "bg-accent text-void hover:bg-accent/90"
                    : "bg-border text-text-dim cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin" />
                    Starting Training...
                  </span>
                ) : (
                  `Start Training (${scope.size} level${scope.size !== 1 ? "s" : ""})`
                )}
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className={clsx(
            "px-4 py-2 rounded-lg text-sm font-['Sora'] transition-colors",
            step > 1
              ? "text-text-soft hover:text-text"
              : "text-text-dim/30 cursor-not-allowed"
          )}
        >
          &larr; Back
        </button>

        {step < 4 && (
          <button
            onClick={() => setStep(Math.min(4, step + 1))}
            className="px-6 py-2 rounded-lg text-sm font-['Sora'] font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
          >
            Next &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
