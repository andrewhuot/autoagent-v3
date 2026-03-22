import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { agentColor } from "@/lib/constants";

interface Message {
  role: "customer" | "agent";
  agent?: string;
  content: string;
  quality?: "good" | "bad";
  annotation?: string;
}

interface HandoffEvent {
  from: string;
  to: string;
  reason: string;
}

type ConversationItem =
  | { type: "message"; data: Message }
  | { type: "handoff"; data: HandoffEvent };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

const beforeConversation: ConversationItem[] = [
  {
    type: "message",
    data: {
      role: "customer",
      content: "Hi, I was charged twice for my subscription last month. Can I get a refund?",
    },
  },
  {
    type: "message",
    data: {
      role: "agent",
      agent: "Orchestrator",
      content: "I'll help you with that billing concern. Let me route you to the right team.",
    },
  },
  {
    type: "handoff",
    data: {
      from: "Orchestrator",
      to: "TechSupportAgent",
      reason: "keyword: 'charged' matched tech support",
    },
  },
  {
    type: "message",
    data: {
      role: "agent",
      agent: "TechSupportAgent",
      content: "I see you're having a technical issue. Can you describe the error you're seeing?",
      quality: "bad",
      annotation: "Misrouted: billing issue sent to tech support",
    },
  },
  {
    type: "message",
    data: {
      role: "customer",
      content: "No, it's not a tech issue. I was double-charged on my credit card.",
    },
  },
  {
    type: "handoff",
    data: {
      from: "TechSupportAgent",
      to: "BillingAgent",
      reason: "manual re-route after misclassification",
    },
  },
  {
    type: "message",
    data: {
      role: "agent",
      agent: "BillingAgent",
      content: "I apologize for the confusion. Let me look into your billing. Yes, I can see the duplicate charge. I'll process a refund.",
      quality: "bad",
      annotation: "No invoice lookup performed before refund promise",
    },
  },
];

const afterConversation: ConversationItem[] = [
  {
    type: "message",
    data: {
      role: "customer",
      content: "Hi, I was charged twice for my subscription last month. Can I get a refund?",
    },
  },
  {
    type: "message",
    data: {
      role: "agent",
      agent: "Orchestrator",
      content: "I understand you have a billing concern about a duplicate charge. Let me connect you with our billing specialist right away.",
      quality: "good",
      annotation: "Correct intent classification with confidence 0.94",
    },
  },
  {
    type: "handoff",
    data: {
      from: "Orchestrator",
      to: "BillingAgent",
      reason: "intent: billing_inquiry (confidence: 0.94)",
    },
  },
  {
    type: "message",
    data: {
      role: "agent",
      agent: "BillingAgent",
      content: "I've pulled up your account. I can see invoice #INV-2847 from March 1 for $29.99 and a duplicate charge #INV-2848 on March 2 for the same amount. The second charge was indeed a duplicate. Let me process your refund.",
      quality: "good",
      annotation: "Invoice lookup performed, specific details cited",
    },
  },
  {
    type: "handoff",
    data: {
      from: "BillingAgent",
      to: "RefundAgent",
      reason: "refund processing required",
    },
  },
  {
    type: "message",
    data: {
      role: "agent",
      agent: "RefundAgent",
      content: "I've verified your refund eligibility and processed a $29.99 refund to your card ending in 4521. You should see it within 3-5 business days. Is there anything else I can help with?",
      quality: "good",
      annotation: "Eligibility check performed before processing",
    },
  },
];

function MessageBubble({ item }: { item: ConversationItem }) {
  if (item.type === "handoff") {
    return (
      <div className="flex items-center gap-2 py-2 px-4">
        <div className="flex-1 h-px bg-border" />
        <div className="flex items-center gap-1.5 text-[10px] text-text-dim">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: agentColor(item.data.from) }}
          />
          <span>{item.data.from}</span>
          <span className="text-text-dim/50 mx-1">&rarr;</span>
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: agentColor(item.data.to) }}
          />
          <span>{item.data.to}</span>
        </div>
        <div className="flex-1 h-px bg-border" />
      </div>
    );
  }

  const msg = item.data;
  const isCustomer = msg.role === "customer";

  return (
    <div className={`flex ${isCustomer ? "justify-end" : "justify-start"} px-2`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 space-y-1 ${
          isCustomer ? "bg-[#18183a]" : "bg-surface"
        } ${
          msg.quality === "good"
            ? "border border-green/30"
            : msg.quality === "bad"
            ? "border border-red/30"
            : "border border-border"
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-1">
          {isCustomer ? (
            <span className="text-[9px] font-['DM_Mono'] text-text-dim uppercase tracking-widest">
              Customer
            </span>
          ) : (
            <>
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: agentColor(msg.agent || "") }}
              />
              <span className="text-[10px] font-['Sora'] font-medium text-text-soft">
                {msg.agent}
              </span>
            </>
          )}
        </div>

        {/* Content */}
        <p className="text-sm text-text leading-relaxed">{msg.content}</p>

        {/* Annotation */}
        {msg.annotation && (
          <p
            className={`text-[10px] font-['DM_Mono'] mt-2 pt-2 border-t border-border/50 ${
              msg.quality === "good" ? "text-green" : "text-red"
            }`}
          >
            {msg.quality === "good" ? "\u2713" : "\u2717"} {msg.annotation}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ConversationReplay({ isOpen, onClose, title }: Props) {
  const [tab, setTab] = useState<"before" | "after" | "side-by-side">("side-by-side");

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-surface border border-border rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="font-['Sora'] text-lg font-semibold text-text">
                  {title || "Conversation Replay"}
                </h2>
                <p className="text-xs text-text-dim mt-0.5">
                  Before / After training comparison
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Tab toggle */}
                <div className="flex items-center gap-1 bg-void rounded-lg p-0.5">
                  {(["before", "after", "side-by-side"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-3 py-1.5 rounded-md text-xs font-['Sora'] transition-colors capitalize ${
                        tab === t
                          ? "bg-accent/15 text-accent"
                          : "text-text-dim hover:text-text-soft"
                      }`}
                    >
                      {t.replace("-", " ")}
                    </button>
                  ))}
                </div>
                {/* Close */}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-void border border-border flex items-center justify-center text-text-dim hover:text-text transition-colors"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {tab === "side-by-side" ? (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-['DM_Mono'] text-red uppercase tracking-widest mb-4">
                      Before Training
                    </p>
                    <div className="space-y-3">
                      {beforeConversation.map((item, i) => (
                        <MessageBubble key={i} item={item} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-['DM_Mono'] text-green uppercase tracking-widest mb-4">
                      After Training
                    </p>
                    <div className="space-y-3">
                      {afterConversation.map((item, i) => (
                        <MessageBubble key={i} item={item} />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-xl mx-auto space-y-3">
                  <p className={`text-[10px] font-['DM_Mono'] uppercase tracking-widest mb-4 ${tab === "before" ? "text-red" : "text-green"}`}>
                    {tab === "before" ? "Before Training" : "After Training"}
                  </p>
                  {(tab === "before" ? beforeConversation : afterConversation).map((item, i) => (
                    <MessageBubble key={i} item={item} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
