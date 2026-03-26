import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";

describe("AgentStudio route", () => {
  it("lets a user queue natural-language agent updates and see the draft preview", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/studio"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Agent Studio" })).toBeInTheDocument();

    const input = screen.getByLabelText("Describe the agent update");

    await user.clear(input);
    await user.type(
      input,
      "Make BillingAgent verify invoices before answering and escalate VIP refund requests sooner."
    );
    await user.click(screen.getByRole("button", { name: "Queue update" }));

    expect(await screen.findByRole("heading", { name: "BillingAgent" })).toBeInTheDocument();
    expect(screen.getAllByText("Invoice-first response guardrail").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Queued changes" })).toBeInTheDocument();
  });
});
