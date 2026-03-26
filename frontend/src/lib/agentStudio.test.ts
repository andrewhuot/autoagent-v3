import { buildStudioDraft } from "@/lib/agentStudio";
import { mockAgents } from "@/lib/mockData";

describe("buildStudioDraft", () => {
  it("derives focused agent changes from natural language requests", () => {
    const draft = buildStudioDraft(
      "Make BillingAgent verify invoices before answering and escalate VIP refund requests sooner.",
      mockAgents
    );

    expect(draft.focusAgent.name).toBe("BillingAgent");
    expect(draft.changeSet.some((item) => item.title.includes("Invoice"))).toBe(true);
    expect(draft.changeSet.some((item) => item.title.includes("VIP"))).toBe(true);
    expect(draft.reviewChecklist).toContain("Replay a VIP refund conversation through the new path.");
  });
});
