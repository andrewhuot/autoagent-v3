import { startTransition, useMemo, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import AgentTreeVisualizer from "@/components/AgentTreeVisualizer";
import { agentColor } from "@/lib/constants";
import { buildStudioDraft, type StudioDraft, type StudioMetricTone } from "@/lib/agentStudio";
import { mockAgents, mockTree } from "@/lib/mockData";
import type { Agent } from "@/types";

interface StudioMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}

const SAMPLE_PROMPTS = [
  "Make BillingAgent verify invoices before answering and escalate VIP refund requests sooner.",
  "Route shipping delays straight to RefundAgent when the order is already lost in transit.",
  "Tighten orchestrator handoffs so specialists inherit the customer's last two actions.",
];

const INITIAL_PROMPT = SAMPLE_PROMPTS[0];
const INITIAL_DRAFT = buildStudioDraft(INITIAL_PROMPT, mockAgents);

function toneClasses(tone: StudioMetricTone): string {
  if (tone === "positive") return "text-green border-green/20 bg-green/8";
  if (tone === "caution") return "text-amber border-amber/20 bg-amber/8";
  return "text-text-soft border-border bg-white/[0.02]";
}

function impactClasses(impact: StudioDraft["changeSet"][number]["impact"]): string {
  if (impact === "high") return "text-green bg-green/10 border-green/20";
  if (impact === "medium") return "text-amber bg-amber/10 border-amber/20";
  return "text-text-soft bg-white/[0.03] border-border";
}

function buildAssistantReply(draft: StudioDraft): string {
  const supportingNames = draft.supportingAgents.map((agent) => agent.name).join(", ");
  const supportLine = supportingNames
    ? ` Supporting agents touched: ${supportingNames}.`
    : "";

  return `Queued ${draft.changeSet.length} changes for ${draft.focusAgent.name}.${supportLine} I converted the request into prompt, policy, and rollout checks so the draft is ready for simulation.`;
}

function AgentChip({ agent, active }: { agent: Agent; active?: boolean }) {
  return (
    <div
      className={clsx(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
        active ? "border-accent/35 bg-accent/12 text-text" : "border-border bg-white/[0.02] text-text-soft"
      )}
    >
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: agentColor(agent.name) }}
      />
      <span>{agent.name}</span>
    </div>
  );
}

export default function AgentStudio() {
  const [composer, setComposer] = useState(INITIAL_PROMPT);
  const [draft, setDraft] = useState<StudioDraft>(INITIAL_DRAFT);
  const [selectedAgentId, setSelectedAgentId] = useState(INITIAL_DRAFT.focusAgent.id);
  const [messages, setMessages] = useState<StudioMessage[]>([
    {
      id: "assistant-intro",
      role: "assistant",
      content:
        "Describe the change in plain language. I’ll translate it into prompt edits, routing updates, and rollout checks for the agent tree.",
    },
    {
      id: "user-initial",
      role: "user",
      content: INITIAL_PROMPT,
    },
    {
      id: "assistant-initial",
      role: "assistant",
      content: buildAssistantReply(INITIAL_DRAFT),
    },
  ]);

  const selectedAgent = useMemo(() => {
    return mockAgents.find((agent) => agent.id === selectedAgentId) ?? draft.focusAgent;
  }, [draft.focusAgent, selectedAgentId]);

  function queueUpdate(prompt: string) {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    const nextDraft = buildStudioDraft(trimmedPrompt, mockAgents);

    startTransition(() => {
      setDraft(nextDraft);
      setSelectedAgentId(nextDraft.focusAgent.id);
      setMessages((current) => [
        ...current,
        {
          id: `user-${current.length + 1}`,
          role: "user",
          content: trimmedPrompt,
        },
        {
          id: `assistant-${current.length + 2}`,
          role: "assistant",
          content: buildAssistantReply(nextDraft),
        },
      ]);
      setComposer("");
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(91,106,240,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(54,216,160,0.14),transparent_35%),linear-gradient(180deg,#050510_0%,#060614_45%,#05050d_100%)]">
      <div className="mx-auto flex max-w-[1700px] flex-col gap-6 p-6 lg:p-8">
        <header className="overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.02] shadow-[0_18px_80px_rgba(0,0,0,0.38)]">
          <div className="flex flex-col gap-5 border-b border-white/6 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-text-dim">
                <span>Conversational Editing</span>
                <span className="h-1 w-1 rounded-full bg-text-dim" />
                <span>{mockTree.name}</span>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <h1 className="font-['Sora'] text-3xl font-semibold text-text">
                  Agent Studio
                </h1>
                <p className="pb-1 text-sm text-text-soft">
                  Update an agent in natural language and watch the draft mutate live.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-white/8 bg-white/[0.04] px-4 py-2 text-xs text-text-soft">
                {draft.branchName}
              </div>
              <button className="rounded-full border border-border px-4 py-2 text-xs text-text-soft transition-colors hover:border-accent/40 hover:text-text">
                Simulate
              </button>
              <button className="rounded-full border border-border px-4 py-2 text-xs text-text-soft transition-colors hover:border-accent/40 hover:text-text">
                Review
              </button>
              <button className="rounded-full bg-accent px-4 py-2 text-xs font-medium text-white shadow-[0_10px_30px_rgba(91,106,240,0.35)] transition-transform hover:-translate-y-0.5">
                Merge draft
              </button>
            </div>
          </div>

          <div className="grid gap-4 px-6 py-5 md:grid-cols-3">
            {draft.metrics.map((metric) => (
              <div
                key={metric.label}
                className={clsx(
                  "rounded-2xl border px-4 py-4",
                  toneClasses(metric.tone)
                )}
              >
                <p className="text-[11px] uppercase tracking-[0.24em]">{metric.label}</p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="font-['Sora'] text-2xl font-semibold text-text">
                      {metric.projected}
                    </p>
                    <p className="mt-1 text-xs text-text-dim">Current {metric.current}</p>
                  </div>
                  <div className="text-right text-xs text-text-soft">
                    <p>Drafted from</p>
                    <p>natural language</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[300px,minmax(0,1fr),360px]">
          <section className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_12px_60px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-text-dim">
                  Change thread
                </p>
                <h2 className="mt-2 font-['Sora'] text-xl font-semibold text-text">
                  Queued changes
                </h2>
              </div>
              <div className="rounded-full border border-accent/20 bg-accent/12 px-3 py-1 text-xs text-accent">
                {draft.changeSet.length} queued
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {draft.changeSet.map((change, index) => (
                <motion.div
                  key={change.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-2xl border border-white/6 bg-[#080814] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-text-dim">
                        {change.kind}
                      </p>
                      <h3 className="mt-2 font-['Sora'] text-sm font-semibold text-text">
                        {change.title}
                      </h3>
                    </div>
                    <span
                      className={clsx(
                        "rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em]",
                        impactClasses(change.impact)
                      )}
                    >
                      {change.impact}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-text-soft">{change.detail}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/6 bg-[#080814] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-text-dim">
                Focus agents
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <AgentChip agent={draft.focusAgent} active />
                {draft.supportingAgents.map((agent) => (
                  <AgentChip key={agent.id} agent={agent} />
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/6 bg-[#080814] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-text-dim">
                Review checklist
              </p>
              <div className="mt-4 space-y-3">
                {draft.reviewChecklist.map((item) => (
                  <div key={item} className="flex gap-3 text-sm leading-6 text-text-soft">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-green" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="flex min-h-[760px] flex-col overflow-hidden rounded-[32px] border border-white/8 bg-[#060610]/90 shadow-[0_16px_70px_rgba(0,0,0,0.34)]">
            <div className="flex items-center justify-between border-b border-white/6 px-6 py-4">
              <div className="flex items-center gap-2">
                {["Chat", "Simulation", "Review"].map((tab, index) => (
                  <button
                    key={tab}
                    className={clsx(
                      "rounded-full px-3 py-1.5 text-xs transition-colors",
                      index === 0
                        ? "bg-white/[0.08] text-text"
                        : "text-text-dim hover:text-text-soft"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="text-xs text-text-dim">{draft.summary}</div>
            </div>

            <div className="relative flex-1 overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:28px_28px] opacity-30" />
              <div className="relative flex h-full flex-col">
                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={clsx(
                        "max-w-[90%] rounded-[24px] border px-5 py-4 text-sm leading-7 shadow-[0_10px_30px_rgba(0,0,0,0.18)]",
                        message.role === "user"
                          ? "ml-auto border-accent/25 bg-accent/12 text-text"
                          : "border-white/8 bg-white/[0.03] text-text-soft"
                      )}
                    >
                      <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-text-dim">
                        {message.role === "user" ? "Change request" : "AutoAgent"}
                      </p>
                      <p>{message.content}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/6 bg-[#060610]/95 px-6 py-5 backdrop-blur">
                  <div className="mb-4 flex flex-wrap gap-2">
                    {SAMPLE_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => setComposer(prompt)}
                        className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-text-soft transition-colors hover:border-accent/30 hover:text-text"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  <label className="sr-only" htmlFor="agent-studio-composer">
                    Describe the agent update
                  </label>
                  <div className="rounded-[28px] border border-white/8 bg-[#080814] p-3 shadow-[0_8px_40px_rgba(0,0,0,0.24)]">
                    <textarea
                      id="agent-studio-composer"
                      value={composer}
                      onChange={(event) => setComposer(event.target.value)}
                      placeholder="Describe the agent update"
                      rows={4}
                      className="min-h-[120px] w-full resize-none bg-transparent px-3 py-3 text-sm leading-7 text-text outline-none placeholder:text-text-dim"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/6 px-2 pt-3">
                      <div className="text-xs text-text-dim">
                        Natural language in, scoped diff out.
                      </div>
                      <button
                        onClick={() => queueUpdate(composer)}
                        className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
                      >
                        Queue update
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-5 rounded-[28px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_12px_60px_rgba(0,0,0,0.25)]">
            <div className="rounded-2xl border border-white/6 bg-[#080814] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-text-dim">
                    Live draft
                  </p>
                  <h2 className="mt-2 font-['Sora'] text-xl font-semibold text-text">
                    {draft.title}
                  </h2>
                </div>
                <div className="rounded-full border border-green/20 bg-green/10 px-3 py-1 text-xs text-green">
                  ready for sim
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-text-soft">{draft.summary}</p>
            </div>

            <div className="rounded-2xl border border-white/6 bg-[#080814] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-text-dim">
                Focused agent
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${agentColor(selectedAgent.name)}22` }}
                >
                  <div
                    className="h-5 w-5 rounded-full"
                    style={{ backgroundColor: agentColor(selectedAgent.name) }}
                  />
                </div>
                <div>
                  <h3 className="font-['Sora'] text-lg font-semibold text-text">
                    {draft.focusAgent.name}
                  </h3>
                  <p className="text-sm text-text-soft">
                    Editing context currently centered on {draft.focusAgent.role}.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-white/6 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-text-dim">Current instruction</p>
                  <p className="mt-2 text-sm leading-6 text-text-soft">{draft.changeSet[0]?.before ?? selectedAgent.instruction}</p>
                </div>
                <div className="rounded-2xl border border-accent/20 bg-accent/8 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-accent">Drafted instruction</p>
                  <p className="mt-2 text-sm leading-6 text-text">{draft.changeSet[0]?.after ?? selectedAgent.instruction}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/6 bg-[#080814] p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-text-dim">
                    Agent topology
                  </p>
                  <p className="mt-1 text-sm text-text-soft">
                    Click a node to inspect surrounding agents.
                  </p>
                </div>
              </div>
              <AgentTreeVisualizer
                agents={mockAgents}
                selectedId={selectedAgentId}
                onSelect={(agent) => setSelectedAgentId(agent.id)}
                width={320}
                height={280}
              />
            </div>

            <div className="rounded-2xl border border-white/6 bg-[#080814] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-text-dim">
                Draft diff
              </p>
              <div className="mt-4 space-y-3">
                {draft.changeSet.map((change) => (
                  <div key={change.id} className="rounded-2xl border border-white/6 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-['Sora'] text-sm font-semibold text-text">
                        {change.title}
                      </h3>
                      <span className="text-[11px] uppercase tracking-[0.24em] text-text-dim">
                        {change.kind}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-text-soft">{change.after}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
