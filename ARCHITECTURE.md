# AutoAgent: Master Architecture Document
**Version**: 3.0 — Multi-Agent Native
**Last Updated**: March 2026
**Status**: Architecture Review

-----

## 1. Product Vision

AutoAgent applies the autonomous experimentation loop from Karpathy's autoresearch to Google ADK **multi-agent systems**. Where autoresearch gives an AI agent a training script and lets it experiment overnight to find a better model, AutoAgent gives an AI agent an entire multi-agent tree — orchestrators, specialists, routing logic, and shared components — and lets it experiment to find a better system.

Enterprise ADK deployments are multi-agent by default. A customer support system isn't one monolithic agent — it's an orchestrator that routes to an AuthenticationAgent, a BillingAgent, a RefundAgent, a TechnicalSupportAgent, and an EscalationAgent. These specialists are reusable across products. The AuthenticationAgent that verifies identity in customer support is the same one used in account management. Optimizing it must improve both contexts without regressing either.

AutoAgent understands this structure natively. It can optimize individual specialist agents in isolation, improve routing logic at the orchestrator level, restructure the agent hierarchy itself, and validate that changes to shared agents don't break any consumer.

**Core principle**: The human defines the agent team and what "better" means. The system runs the experiments the human would never have time for — across every agent, every routing path, and every interaction pattern.

**Competitive positioning for CES**: "Your agent teams improve overnight. Every specialist gets sharper. Routing gets smarter. And shared agents are validated against every system that uses them."

-----

## 2. Foundational Concepts

### 2.1 The Agent Tree

AutoAgent operates on an **Agent Tree** — the full hierarchy of agents that compose a multi-agent system.

An Agent Tree has three types of nodes:

**Orchestrator Agent**: The root or mid-level agent that routes conversations to specialists. It uses LLM-driven delegation (via `sub_agents`) or explicit invocation (via `AgentTool`). Its primary artifact is its `instruction` (which encodes routing logic) and its `sub_agents` or `tools` list.

**Specialist Agent**: A leaf agent that handles a specific domain. It has its own instructions, tools, and potentially its own sub-agents. Its primary artifacts are its `instruction` and `tools`. Examples: RefundAgent, BillingAgent, TechnicalSupportAgent.

**Workflow Agent**: A deterministic orchestrator (SequentialAgent, ParallelAgent, LoopAgent) that controls execution order without LLM reasoning. Its primary artifact is its `children` list and the flow logic.

```
Example Enterprise Agent Tree:

┌──────────────────────────────────┐
│   CustomerSupportOrchestrator    │  ← Orchestrator
│       (LLM-driven routing)       │
└─────┬────┬────┬────┬────┬───────┘
      │    │    │    │    │
┌─────┘    │    │    │    └─────┐
▼          ▼    ▼    ▼          ▼
┌─────────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐
│  Auth   │ │Billing│ │Refund│ │TechSup│ │Escalation│
│  Agent  │ │Agent │ │Agent │ │Agent │ │Agent     │
└─────────┘ └──────┘ └──┬───┘ └──────┘ └──────────┘
     ▲                   │                Specialists
     │             ┌─────┴─────┐
     │             ▼           ▼
 [SHARED]    ┌─────────┐ ┌─────────┐
 Used by     │Eligiblty│ │Execution│
 multiple    │  Check  │ │  Agent  │
 trees       └─────────┘ └─────────┘
```

### 2.2 The Agent Library

Enterprise deployments reuse specialist agents across multiple trees. An AuthenticationAgent may serve both the CustomerSupport tree and the AccountManagement tree.

AutoAgent models this with an **Agent Library** — a registry of reusable agent definitions that can be referenced by multiple trees.

**Single-tree agents**: Exist only within one tree. Changes are evaluated only against that tree's eval suite.

**Library agents (shared)**: Referenced by multiple trees. Changes must be evaluated against the eval suites of ALL consuming trees. AutoAgent enforces this by tracking the dependency graph and running cross-tree validation before keeping any change to a library agent.

### 2.3 Optimization Levels

AutoAgent can make changes at five distinct levels, each with different blast radius and evaluation requirements:

|Level |What Changes |Blast Radius |Eval Scope |
|--------------------------|-------------------------------------------------------------|--------------------|--------------------------------------------------------------|
|L1: Specialist Instruction|A single specialist's `instruction` text |That specialist only|Specialist unit evals + end-to-end cases that route through it|
|L2: Specialist Tools      |A specialist's tool descriptions, parameters, or tool list   |That specialist only|Tool selection evals + cases involving those tools            |
|L3: Orchestrator Routing  |The orchestrator's `instruction` or `sub_agents` descriptions|All routing paths   |Routing evals + end-to-end cases across all specialists       |
|L4: Shared Agent          |A library agent's instruction or tools                       |ALL consuming trees |Cross-tree validation against every consumer's eval suite     |
|L5: Structure             |Adding, removing, splitting, or merging agents in the tree   |The entire tree     |Full end-to-end eval suite                                    |

The Proposer agent must declare which level a hypothesis targets. This determines the eval scope and the approval requirements.

-----

## 3. End-to-End User Journey

### Phase 0: ONBOARD (Target: 5 minutes)

**Problem solved**: Import a multi-agent system and auto-generate eval cases that test both individual agents and the interactions between them.

**Entry criteria**: User has a functional ADK multi-agent system (a Python module with a root agent and sub-agents) or an Agent Studio export.

**User actions**:
1. Import the agent tree.
1. Optionally tag agents as "shared" (library agents) and link them to other trees.
1. Review the auto-generated eval suite.
1. Adjust category weights and enable/disable specific cases.

**System behaviors**:

**0.1 Tree Analyzer**: Parses the entire agent hierarchy.

Input: Root agent module.
Output: `AgentTreeProfile` containing:

```json
{
  "root_agent": {
    "name": "CustomerSupportOrchestrator",
    "type": "llm_agent",
    "model": "gemini-2.5-flash",
    "instruction": "...",
    "routing_mode": "llm_driven_transfer",
    "sub_agents": [
      {
        "name": "AuthAgent",
        "type": "llm_agent",
        "is_library_agent": true,
        "library_id": "auth-agent-v2",
        "consuming_trees": ["customer_support", "account_management"],
        "description": "Verifies customer identity",
        "instruction": "...",
        "tools": [
          { "name": "verify_email", "description": "...", "parameters": {...} },
          { "name": "verify_phone", "description": "...", "parameters": {...} }
        ],
        "sub_agents": []
      },
      {
        "name": "RefundAgent",
        "type": "llm_agent",
        "is_library_agent": false,
        "description": "Handles refund requests",
        "instruction": "...",
        "tools": [...],
        "sub_agents": [
          { "name": "EligibilityCheck", "type": "llm_agent", ... },
          { "name": "RefundExecution", "type": "llm_agent", ... }
        ]
      }
    ],
    "workflow_agents": [
      {
        "name": "RefundFlow",
        "type": "sequential_agent",
        "children": ["EligibilityCheck", "RefundExecution"]
      }
    ]
  },
  "total_agents": 8,
  "tree_depth": 3,
  "library_agents": ["AuthAgent"],
  "tools_total": 14,
  "routing_paths": [
    "root → AuthAgent",
    "root → BillingAgent",
    "root → RefundAgent → EligibilityCheck → RefundExecution",
    "root → TechSupportAgent",
    "root → EscalationAgent"
  ]
}
```

**0.2 Multi-Level Eval Generator**: Produces eval cases at three levels.

**Level 1 — Specialist Unit Evals**: For each specialist agent, generate test cases that exercise that agent in isolation (bypassing the orchestrator). These test the specialist's core competence: does it use the right tools, give good responses, and handle edge cases within its domain?

Method: For each specialist, extract its instruction and tools, then generate rule-extraction, tool-selection, and adversarial test cases exactly as in the single-agent design. The key difference: these cases invoke the specialist directly, not through the orchestrator.

Expected count: 3-8 cases per specialist agent.

**Level 2 — Routing Evals**: Test the orchestrator's ability to route conversations to the correct specialist. For each specialist, generate a user message that should route to it AND a user message that's ambiguous between two specialists.

Method: Use the specialist descriptions (which are the LLM's routing signals in ADK) to generate test messages. For each pair of specialists with potentially overlapping domains, generate a disambiguation test.

Expected count: 2× number of specialists + disambiguation pairs.

Example routing eval:
```json
{
  "eval_id": "routing_refund_vs_billing",
  "category": "routing",
  "query": "I was charged twice for my subscription last month",
  "expected_trajectory": [
    { "agent": "CustomerSupportOrchestrator", "action": "transfer_to", "target": "BillingAgent" }
  ],
  "note": "Double charge is billing, not refund — even though the customer may want money back"
}
```

**Level 3 — End-to-End Integration Evals**: Test complete multi-agent flows that cross multiple specialists. These use ADK's User Simulation to drive multi-turn conversations where the user's goal requires coordination between agents.

Method: For each routing path in the tree, generate a `ConversationScenario` with a goal that exercises that path. For paths that involve handoffs between agents, verify the handoff occurs correctly and context is preserved.

Expected count: 1-3 scenarios per routing path.

Example end-to-end eval:
```json
{
  "eval_id": "e2e_auth_then_refund",
  "category": "end_to_end",
  "scenario": {
    "goal": "Customer CUST001 wants a refund for order ORD-102",
    "expected_agent_sequence": ["AuthAgent", "RefundAgent", "EligibilityCheck", "RefundExecution"],
    "success_criteria": "Customer identity is verified, order is looked up, eligibility is checked, and refund is issued or denied with explanation"
  }
}
```

**Level 4 — Cross-Tree Evals** (for library agents): For each library agent, pull eval suites from every consuming tree and create a combined validation set.

Method: If AuthAgent is used by both CustomerSupport and AccountManagement trees, the cross-tree eval set is the union of both trees' auth-related eval cases. Any change to AuthAgent must pass ALL of them.

Expected count: Sum of relevant cases across all consuming trees.

Total expected eval suite: 40-120 cases for a typical enterprise multi-agent system.

**Exit criteria**: User has reviewed the eval suite, toggled cases, and clicked "Run Health Scan."

-----

### Phase 1: DIAGNOSE (Target: 2 minutes)

**Problem solved**: Identify weaknesses at every level — individual specialists, routing, handoffs, and end-to-end flows.

**System behaviors**:

**1.1 Multi-Level Baseline**: Run all eval levels and produce a `MultiAgentDiagnosticReport`.

The diagnostic report has a hierarchical structure mirroring the agent tree:

```json
{
  "overall_score": 0.62,
  "tree_level_scores": {
    "specialist_unit": 0.68,
    "routing": 0.55,
    "end_to_end": 0.58,
    "cross_tree": 0.71
  },
  "per_agent_scores": {
    "AuthAgent": { "unit_score": 0.82, "note": "Strong on identity verification" },
    "BillingAgent": { "unit_score": 0.71, "note": "Struggles with disputed charges" },
    "RefundAgent": { "unit_score": 0.54, "note": "Skips eligibility check in 40% of cases" },
    "TechSupportAgent": { "unit_score": 0.65, "note": "Good on common issues, fails on edge cases" },
    "EscalationAgent": { "unit_score": 0.78, "note": "Reliable handoff" },
    "Orchestrator": { "routing_score": 0.55, "note": "Confuses billing vs refund in 30% of cases" }
  },
  "opportunities": [
    {
      "title": "Orchestrator misroutes billing disputes to RefundAgent",
      "level": "L3",
      "target_agent": "CustomerSupportOrchestrator",
      "impact": 8,
      "priority": "critical",
      "root_cause": "BillingAgent and RefundAgent descriptions overlap on 'charge' and 'payment' keywords"
    },
    {
      "title": "RefundAgent skips eligibility verification",
      "level": "L1",
      "target_agent": "RefundAgent",
      "impact": 6,
      "priority": "high",
      "root_cause": "Instruction lacks explicit step-by-step refund flow"
    },
    {
      "title": "Context lost during Auth → Refund handoff",
      "level": "L3",
      "target_agent": "CustomerSupportOrchestrator",
      "impact": 4,
      "priority": "medium",
      "root_cause": "Customer's original request is not preserved in session state after auth transfer"
    }
  ]
}
```

**1.2 Health Scan UI**: Visualizes the tree with color-coded per-agent scores.

Key requirement: the health scan must show the **agent tree visually** — a node-link diagram where each agent is a node, colored by its score (green → yellow → red), with edges showing routing paths. The user can click any agent to see its individual diagnostic.

This is more intuitive than a flat list because it shows where problems cluster in the hierarchy.

-----

### Phase 2: CONFIGURE (Target: 1 minute)

Same as V2, with one addition:

**Question 4: Optimization Scope** (multi-select)
- "Individual specialists" — optimize each specialist independently (L1, L2)
- "Routing and orchestration" — optimize the orchestrator's routing logic (L3)
- "Shared agents" — optimize library agents with cross-tree validation (L4)
- "Structure" — allow adding, splitting, or merging agents (L5)
- "All levels" — full optimization across the entire tree

This determines which levels the Proposer is allowed to target.

**Strategy Generator Enhancement**: The generated strategy.md now includes a per-agent research plan:

```markdown
## Research Plan

### Orchestrator: CustomerSupportOrchestrator [L3 — HIGH PRIORITY]
Problem: Misroutes billing disputes to RefundAgent (30% error rate)
Direction: Differentiate BillingAgent and RefundAgent descriptions more clearly
Constraint: Must not disrupt correct routing for other specialists

### Specialist: RefundAgent [L1 — HIGH PRIORITY]
Problem: Skips eligibility check in 40% of cases
Direction: Add explicit step-by-step decision tree to instruction
Constraint: Must not increase average turn count by more than 1

### Specialist: BillingAgent [L1 — MEDIUM PRIORITY]
Problem: Struggles with disputed charges
Direction: Add handling for common dispute scenarios

### Shared: AuthAgent [L4 — LOW PRIORITY (score already 0.82)]
Note: Any changes require cross-tree validation against AccountManagement
Constraint: Must maintain ≥0.80 score in both consuming trees
```

-----

### Phase 3: TRAIN (The Core Loop)

**Fundamental change from single-agent**: The Proposer now operates at multiple levels of the tree, and each experiment has an explicit **target scope** that determines the eval coverage.

**3.1 The Multi-Level Experiment Loop**

Each wave tests 2-4 hypotheses in parallel, but hypotheses can target different agents and different levels:

```
Wave 1:
├─ Branch A [L3]: Improve orchestrator routing by differentiating specialist descriptions
├─ Branch B [L1]: Add refund decision tree to RefundAgent
├─ Branch C [L1]: Add dispute handling to BillingAgent
└─ (No L4 changes in Wave 1 — AuthAgent is low priority)

Wave 2:
├─ Branch A [L1]: Build on Wave 1 RefundAgent improvements with edge cases
├─ Branch B [L3]: Add context preservation instruction to orchestrator for handoffs
└─ Branch C [L2]: Enrich BillingAgent tool descriptions

Wave 3: SYNTHESIS WAVE
├─ Branch A [COMBINED]: Merge Wave 1 routing fix + Wave 2 context preservation
└─ Branch B [L5]: Split RefundAgent into RefundEligibility + RefundExecution sub-agents
```

**3.2 Scoped Evaluation**

When a hypothesis targets a specific agent and level, the system runs only the relevant subset of the eval suite, plus a lightweight "regression check" against the full suite:

|Hypothesis Level          |Primary Evals (full scoring)                                              |Regression Check (pass/fail only)               |
|--------------------------|--------------------------------------------------------------------------|-------------------------------------------------|
|L1: Specialist Instruction|Specialist unit evals for that agent + end-to-end cases routing through it|All other eval cases (must not regress)           |
|L2: Specialist Tools      |Tool selection evals for that agent                                       |Same                                              |
|L3: Orchestrator Routing  |All routing evals + all end-to-end evals                                  |Specialist unit evals (should be unaffected)      |
|L4: Shared Agent          |Cross-tree eval suite (ALL consuming trees)                               |Everything else in every consuming tree           |
|L5: Structure             |Full eval suite for the entire tree                                       |Cross-tree if shared agents are affected          |

This scoped evaluation is a critical performance optimization. A full eval suite of 100 cases takes 3 minutes. A scoped eval of 15 relevant cases takes 30 seconds. This means the system can run 3-4× more experiments per hour when targeting individual specialists.

**3.3 The Multi-Agent Proposer**

The Proposer's system prompt is enhanced to understand the tree structure:

```
You are an autonomous agent researcher optimizing a Google ADK multi-agent system.

## Agent Tree Structure
{tree_profile_json}

## Per-Agent Scores
{per_agent_diagnostic}

## Optimization Levels Available
{allowed_levels}

## Strategy
{strategy_md}

## Research Memory
{research_memory}

## Instructions
Generate {branch_count} hypotheses for the next wave.

IMPORTANT:
- Each hypothesis must specify a TARGET AGENT and OPTIMIZATION LEVEL
- L1/L2 changes to a specialist must NOT modify other agents
- L3 changes to the orchestrator affect routing for ALL specialists
- L4 changes to shared agents MUST be validated against all consuming trees
- L5 structural changes require justification (splitting/merging only when a specialist handles too many distinct domains)

For each hypothesis, specify:
- target_agent: which agent to modify
- level: L1, L2, L3, L4, or L5
- changes: the specific modifications
- eval_scope: which eval cases are relevant
- blast_radius: which other agents or trees could be affected
```

**Proposer Output Enhancement**:

```json
{
  "hypotheses": [
    {
      "branch_id": "A",
      "target_agent": "CustomerSupportOrchestrator",
      "level": "L3",
      "title": "Differentiate BillingAgent and RefundAgent routing descriptions",
      "rationale": "Routing evals show 30% confusion between billing and refund. The descriptions overlap on 'charge' and 'payment'. Fix: make BillingAgent description focus on 'account charges, subscription billing, payment methods' and RefundAgent on 'returning items, order cancellation, money back'.",
      "blast_radius": ["BillingAgent", "RefundAgent"],
      "changes": [
        {
          "agent": "BillingAgent",
          "field": "description",
          "new_value": "Expert in account charges, subscription billing, payment method updates, and invoice inquiries. Does NOT handle product returns or refund requests."
        },
        {
          "agent": "RefundAgent",
          "field": "description",
          "new_value": "Handles product returns, order cancellations, and refund processing. Does NOT handle billing disputes or subscription changes."
        }
      ],
      "eval_scope": {
        "primary": ["routing_*", "e2e_billing_*", "e2e_refund_*"],
        "regression": ["all"]
      }
    },
    {
      "branch_id": "B",
      "target_agent": "RefundAgent",
      "level": "L1",
      "title": "Add explicit refund decision tree to instruction",
      "rationale": "RefundAgent skips eligibility check in 40% of cases. Adding a structured flow: verify order → check eligibility → confirm with customer → execute.",
      "blast_radius": ["RefundAgent only"],
      "changes": [
        {
          "agent": "RefundAgent",
          "field": "instruction",
          "action": "append",
          "content": "REFUND PROCESS (follow exactly): 1. Look up the order using lookup_order 2. Check eligibility: order must be within 30-day return window 3. If eligible: confirm amount and get customer approval 4. If ineligible: explain policy and offer alternatives NEVER skip steps 1-2."
        }
      ],
      "eval_scope": {
        "primary": ["unit_refund_*", "e2e_refund_*"],
        "regression": ["routing_*"]
      }
    }
  ]
}
```

**3.4 Cross-Tree Validation (for L4 changes)**

When a hypothesis modifies a library agent (L4), the system must validate against all consuming trees:

```
Hypothesis: Improve AuthAgent instruction for faster verification

Step 1: Apply change to AuthAgent definition in the Agent Library
Step 2: For each consuming tree:
   a. Rebuild the tree with the modified AuthAgent
   b. Run that tree's auth-related eval cases (primary)
   c. Run that tree's full eval suite (regression check)
Step 3: The hypothesis is KEPT only if it passes ALL consuming trees
Step 4: If it improves Tree A but regresses Tree B, REVERT
```

This prevents the "fix one thing, break another" problem that's endemic when optimizing shared components.

The UI clearly shows the cross-tree validation results:

```
Cross-Tree Validation for AuthAgent change:
  ✓ CustomerSupport: auth evals 0.85 → 0.89 (+0.04)
  ✓ AccountManagement: auth evals 0.82 → 0.84 (+0.02)
  → KEPT (improved in both contexts)
```

or:

```
Cross-Tree Validation for AuthAgent change:
  ✓ CustomerSupport: auth evals 0.85 → 0.89 (+0.04)
  ✗ AccountManagement: auth evals 0.82 → 0.78 (-0.04)
  → REVERTED (regressed in AccountManagement)
```

**3.5 Structural Changes (L5)**

L5 changes modify the agent tree itself. The Proposer can propose:

**Split**: When a specialist handles too many distinct domains (e.g., a single "OrderAgent" handling both order status and refund requests), split it into two specialists. The Proposer generates instructions and tool assignments for both new agents and updates the orchestrator's routing.

**Merge**: When two specialists have significant overlap and the routing between them is error-prone, merge them into a single specialist with a combined instruction.

**Add**: When the diagnostic identifies a capability gap (e.g., no agent handles international shipping queries), propose a new specialist with instructions and tools.

**Restructure Workflow**: Change a SequentialAgent to a ParallelAgent (for independent steps) or add a LoopAgent for iterative refinement.

L5 changes require full eval suite execution and are only proposed when: (a) the user selected "Structure" or "All levels" in configuration, (b) improvement at other levels has plateaued (diminishing returns detected), and (c) the diagnostic identifies a structural problem (e.g., consistently misrouted conversations suggest the agent boundaries are wrong).

**3.6 Pareto Scoring (Multi-Agent Extension)**

The scoring system adds per-agent dimension tracking:

**Global dimensions** (same as single-agent):
- `trajectory`: Correct tool calls across the full conversation
- `response`: Response quality in final agent response
- `task_completion`: User's goal achieved
- `safety`: No policy violations
- `efficiency`: Conversation length

**Routing dimension** (new):
- `routing_accuracy`: Percentage of conversations routed to the correct specialist on first attempt

**Per-agent dimensions** (new):
- For each specialist: `{agent_name}_unit_score` tracking that specialist's isolated performance

Constraints:
- `safety` >= 0.90 (global floor)
- `routing_accuracy` >= 0.70 (routing floor)
- For shared agents: score must not decrease in ANY consuming tree

**3.7 Research Memory (Multi-Agent Extension)**

Research memory entries now include the target agent and level:

```json
{
  "experiment_id": "uuid",
  "target_agent": "RefundAgent",
  "level": "L1",
  "hypothesis": "Add refund decision tree",
  "outcome": "kept",
  "insight": "Structured decision trees in specialist instructions dramatically reduce step-skipping. This pattern likely applies to other specialists.",
  "reusable_pattern": "For any specialist that must follow a multi-step process, encode the steps explicitly with 'NEVER skip steps X-Y'.",
  "transferable_to": ["BillingAgent", "TechSupportAgent"]
}
```

The `transferable_to` field suggests other agents where the same pattern might apply. The Proposer uses this to generate hypotheses that apply proven patterns across the tree.

-----

### Phase 4: REVIEW — Morning Briefing

**Multi-agent enhancements to the briefing**:

**4.1 Tree-Level Summary**: Instead of just a global score, show the improvement per agent:

```
Agent Performance Changes:
  Orchestrator routing: 55% → 78% (+23%) ← biggest improvement
  RefundAgent:          54% → 81% (+27%)
  BillingAgent:         71% → 79% (+8%)
  AuthAgent:            82% → 82% (no change, low priority)
  TechSupportAgent:     65% → 68% (+3%)
  EscalationAgent:      78% → 79% (+1%)
```

**4.2 Routing Improvement Visualization**: A Sankey diagram or flow visualization showing how routing accuracy improved. Before: 30% of billing queries misrouted to RefundAgent. After: 5% misrouted.

**4.3 Cross-Tree Validation Summary**: For any shared agent changes, show the results across all consuming trees:

```
Shared Agent Validation:
  AuthAgent: No changes applied (low priority)
  ✓ All consuming trees unaffected
```

**4.4 Before/After at the Multi-Agent Level**: The conversation replay now shows which agent handled each turn, with handoff points highlighted:

```
Before:
  User → Orchestrator → [MISROUTE] RefundAgent → "I can help with your refund..."
  User: "No, I was charged twice, I need the billing sorted out"
  RefundAgent → [CONFUSED] → eventually transfers to BillingAgent

After:
  User → Orchestrator → [CORRECT] BillingAgent → "I see a duplicate charge on your account from March 15th. Let me investigate..."
```

-----

### Phase 5: DEPLOY

**Multi-agent deployment considerations**:

**5.1 Granular Deployment**: Instead of deploying the entire tree at once, support deploying individual agent updates:

- "Deploy RefundAgent changes only" — updates only the RefundAgent's instruction
- "Deploy routing changes only" — updates only the orchestrator
- "Deploy everything" — full tree update

Granular deployment reduces risk. If the RefundAgent improvement is high-confidence but the routing change is more experimental, the user can deploy them separately and monitor each.

**5.2 Shared Agent Deployment**: When a library agent is updated, the deployment must coordinate across all consuming trees:

1. Deploy the updated library agent
1. Validate all consuming trees are still functional (automated health check)
1. If any consuming tree fails the health check, roll back the library agent

**5.3 Canary by Agent**: Route a percentage of conversations to the new version of a specific specialist while keeping other agents unchanged. This isolates the impact of individual agent changes.

-----

### Phase 6: LEARN (Continuous)

**Multi-agent production feedback**:

**6.1 Per-Agent Failure Attribution**: When a production conversation fails, the system identifies WHICH agent failed. Was it a routing error (orchestrator) or a domain error (specialist)? This attribution determines which agent's eval suite gets the new case.

**6.2 Handoff Quality Monitoring**: Track how well context is preserved during agent transfers. If customers frequently repeat themselves after a handoff, generate eval cases that test context preservation at transition points.

**6.3 Agent Utilization Monitoring**: Track which specialists are invoked most frequently and which are underutilized. An underutilized agent may indicate a routing problem (it should be invoked more) or a redundancy (it could be merged with another).

-----

## 4. Data Model

### 4.1 Agent-Related Tables

**agent_trees table**:

|Column     |Type                                          |Description                                     |
|-----------|----------------------------------------------|-------------------------------------------------|
|id         |UUID                                          |Primary key                                      |
|name       |VARCHAR(255)                                  |Tree display name (e.g., "Customer Support")     |
|source_type|ENUM('adk_python', 'agent_studio', 'git_repo')|Import source                                    |
|source_ref |TEXT                                          |Path, URL, or project ID                         |
|tree_profile|JSONB                                        |Full AgentTreeProfile from analyzer              |
|created_at |TIMESTAMP                                     |                                                 |
|updated_at |TIMESTAMP                                     |                                                 |

**agents table** (individual agents within trees or the library):

|Column         |Type                                                         |Description                                      |
|---------------|-------------------------------------------------------------|-------------------------------------------------|
|id             |UUID                                                         |Primary key                                      |
|tree_id        |UUID                                                         |FK → agent_trees (null for library agents)       |
|library_id     |VARCHAR(100)                                                 |Unique ID for library agents (null for tree-only)|
|name           |VARCHAR(255)                                                 |Agent name                                       |
|agent_type     |ENUM('llm_agent', 'sequential', 'parallel', 'loop', 'custom')                                                              |                                                 |
|role           |ENUM('orchestrator', 'specialist', 'workflow', 'shared')     |Role in the tree                                 |
|parent_agent_id|UUID                                                         |FK → agents (null for root)                      |
|instruction    |TEXT                                                         |Current instruction text                         |
|description    |TEXT                                                         |Description used for routing                     |
|model          |VARCHAR(100)                                                 |LLM model identifier                             |
|tools          |JSONB                                                        |Tool definitions                                 |
|config_snapshot|TEXT                                                         |Full Python definition                           |
|created_at     |TIMESTAMP                                                    |                                                 |
|updated_at     |TIMESTAMP                                                    |                                                 |

**agent_library_consumers table** (tracks which trees use which library agents):

|Column           |Type        |Description                                           |
|-----------------|------------|------------------------------------------------------|
|library_agent_id |UUID        |FK → agents (where library_id is not null)            |
|consumer_tree_id |UUID        |FK → agent_trees                                      |
|integration_point|VARCHAR(255)|Which parent agent in the tree references this        |
|created_at       |TIMESTAMP   |                                                      |

### 4.2 Eval-Related Tables

**eval_suites table**:

|Column          |Type        |Description             |
|----------------|------------|------------------------|
|id              |UUID        |Primary key             |
|tree_id         |UUID        |FK → agent_trees        |
|name            |VARCHAR(255)|                        |
|category_weights|JSONB       |                        |
|safety_floor    |FLOAT       |                        |
|routing_floor   |FLOAT       |Minimum routing accuracy|
|created_at      |TIMESTAMP   |                        |

**eval_cases table**:

|Column                 |Type                                                          |Description                                      |
|-----------------------|--------------------------------------------------------------|-------------------------------------------------|
|id                     |UUID                                                          |Primary key                                      |
|suite_id               |UUID                                                          |FK → eval_suites                                 |
|level                  |ENUM('specialist_unit', 'routing', 'end_to_end', 'cross_tree')|Eval level                                       |
|target_agent_id        |UUID                                                          |FK → agents (which agent this primarily tests)   |
|category               |VARCHAR(50)                                                   |                                                 |
|source                 |ENUM('auto_generated', 'manual', 'production')                |                                                 |
|enabled                |BOOLEAN                                                       |                                                 |
|scenario_json          |JSONB                                                         |Full eval case (ADK format)                      |
|expected_agent_sequence|JSONB                                                         |Expected agent routing path for multi-agent cases|
|expected_trajectory    |JSONB                                                         |Expected tool calls                              |
|expected_response      |TEXT                                                           |                                                 |
|mock_tool_outputs      |JSONB                                                         |                                                 |
|created_at             |TIMESTAMP                                                     |                                                 |

### 4.3 Experiment-Related Tables

**training_sessions table**:

|Column          |Type                                                  |Description                                    |
|----------------|------------------------------------------------------|-----------------------------------------------|
|id              |UUID                                                  |Primary key                                    |
|tree_id         |UUID                                                  |FK → agent_trees                               |
|eval_suite_id   |UUID                                                  |FK → eval_suites                               |
|strategy_md     |TEXT                                                   |                                               |
|allowed_levels  |VARCHAR(5)[]                                          |Which optimization levels are permitted        |
|config          |JSONB                                                 |Priority, duration, exploration style          |
|status          |ENUM('configuring', 'running', 'completed', 'stopped')|                                               |
|baseline_scores |JSONB                                                 |Per-agent and global baseline                  |
|final_scores    |JSONB                                                 |Per-agent and global final                     |
|total_experiments|INT                                                  |                                               |
|started_at      |TIMESTAMP                                             |                                               |
|completed_at    |TIMESTAMP                                             |                                               |

**experiments table**:

|Column                |Type                                            |Description                                              |
|----------------------|------------------------------------------------|---------------------------------------------------------|
|id                    |UUID                                            |Primary key                                              |
|session_id            |UUID                                            |FK → training_sessions                                   |
|wave_number           |INT                                             |                                                         |
|branch_id             |VARCHAR(1)                                      |                                                         |
|parent_id             |UUID                                            |FK → experiments                                         |
|target_agent_id       |UUID                                            |FK → agents (primary agent modified)                     |
|optimization_level    |VARCHAR(2)                                      |L1, L2, L3, L4, L5                                      |
|blast_radius          |UUID[]                                          |Agent IDs potentially affected                           |
|hypothesis_title      |VARCHAR(500)                                    |                                                         |
|hypothesis_rationale  |TEXT                                             |                                                         |
|config_diff           |TEXT                                             |Unified diff                                             |
|per_agent_config_diffs|JSONB                                           |{ agent_name: diff_text } for multi-agent changes        |
|status                |ENUM('running', 'kept', 'reverted', 'synthesis')|                                                         |
|scores                |JSONB                                           |Global scores                                            |
|per_agent_scores      |JSONB                                           |{ agent_name: { trajectory, response, … } }              |
|routing_accuracy      |FLOAT                                           |Orchestrator routing score                               |
|cross_tree_results    |JSONB                                           |{ tree_name: { passed, scores } } for L4 changes         |
|eval_scope_used       |JSONB                                           |Which eval cases were run (primary vs regression)        |
|impact_points         |FLOAT                                           |                                                         |
|summary               |TEXT                                             |                                                         |
|tokens_used           |INT                                              |                                                         |
|duration_ms           |INT                                              |                                                         |
|created_at            |TIMESTAMP                                       |                                                         |

**research_memory table**:

|Column          |Type         |Description                                  |
|----------------|-------------|---------------------------------------------|
|id              |UUID         |Primary key                                  |
|session_id      |UUID         |FK → training_sessions                       |
|experiment_id   |UUID         |FK → experiments                             |
|target_agent_id |UUID         |FK → agents                                  |
|level           |VARCHAR(2)   |                                             |
|insight         |TEXT          |                                             |
|reusable_pattern|TEXT          |                                             |
|anti_pattern    |TEXT          |                                             |
|transferable_to |UUID[]        |Agent IDs this pattern might apply to        |
|tags            |VARCHAR(50)[] |                                             |
|created_at      |TIMESTAMP    |                                             |

### 4.4 Deployment Tables

**deployments table**:

|Column                  |Type                                                  |Description                                          |
|------------------------|------------------------------------------------------|-----------------------------------------------------|
|id                      |UUID                                                  |Primary key                                          |
|session_id              |UUID                                                  |FK → training_sessions                               |
|scope                   |ENUM('full_tree', 'single_agent', 'library_agent')    |                                                     |
|target_agent_ids        |UUID[]                                                |Which agents are being deployed                      |
|mode                    |ENUM('replace', 'canary')                             |                                                     |
|canary_percentage       |INT                                                    |                                                     |
|status                  |ENUM('deploying', 'active', 'promoted', 'rolled_back')|                                                     |
|rollback_configs        |JSONB                                                 |{ agent_id: config_snapshot } for each deployed agent|
|cross_tree_health_checks|JSONB                                                 |For library agent deployments                        |
|deployed_at             |TIMESTAMP                                             |                                                     |

-----

## 5. System Architecture

### 5.1 Component Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        AutoAgent Platform                            │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                          WEB LAYER                               │ │
│  │                      React Dashboard                             │ │
│  │  ┌────────────┐ ┌───────────┐ ┌──────────┐ ┌─────────────────┐  │ │
│  │  │Agent Tree  │ │Health Scan│ │ Training │ │Morning Briefing │  │ │
│  │  │Visualizer  │ │(per-agent)│ │  Live    │ │(per-agent)      │  │ │
│  │  └────────────┘ └───────────┘ └──────────┘ └─────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                     API LAYER (FastAPI)                           │ │
│  │  /trees/*  /agents/*  /library/*  /evals/*  /sessions/*          │ │
│  │  /experiments/*  /deploy/*  /ws/live                             │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                        CORE ENGINE                               │ │
│  │                                                                  │ │
│  │  ┌──────────────┐ ┌──────────────────┐ ┌────────────────────┐   │ │
│  │  │ Tree Analyzer │ │ Multi-Level Eval │ │ Strategy Generator │   │ │
│  │  │ (parses full  │ │    Generator     │ │ (per-agent plans)  │   │ │
│  │  │  hierarchy)   │ │  (L1-L4 cases)   │ │                    │   │ │
│  │  └──────────────┘ └──────────────────┘ └────────────────────┘   │ │
│  │                                                                  │ │
│  │  ┌────────────────────────────────────────────────────────────┐  │ │
│  │  │              MULTI-LEVEL EXPERIMENT LOOP                   │  │ │
│  │  │                                                            │  │ │
│  │  │  ┌────────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐ │  │ │
│  │  │  │ Multi-Agent │ │ Scoped   │ │ Pareto │ │ Cross-Tree   │ │  │ │
│  │  │  │  Proposer   │ │  Eval    │ │ Scorer │ │  Validator   │ │  │ │
│  │  │  └────────────┘ │  Runner  │ └────────┘ └──────────────┘ │  │ │
│  │  │  ┌────────────┐ └──────────┘ ┌────────┐ ┌──────────────┐ │  │ │
│  │  │  │ Research    │ ┌──────────┐ │Diminish│ │  Structural  │ │  │ │
│  │  │  │  Memory     │ │Synthesizr│ │Returns │ │ Proposer(L5) │ │  │ │
│  │  │  └────────────┘ └──────────┘ └────────┘ └──────────────┘ │  │ │
│  │  └────────────────────────────────────────────────────────────┘  │ │
│  │                                                                  │ │
│  │  ┌────────────────────────────────────────────────────────────┐  │ │
│  │  │                   BRIEFING GENERATOR                       │  │ │
│  │  │  Per-agent ranking · Tree visualization · Routing sankey   │  │ │
│  │  │  Cross-tree summary · Multi-agent before/after replays     │  │ │
│  │  └────────────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                         DATA LAYER                               │ │
│  │  PostgreSQL  │  Agent Library Registry  │  Git  │  Blob Storage  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                     INTEGRATION LAYER                            │ │
│  │  Vertex AI Agent Engine  │  CES / Agent Studio  │  Cloud Run     │ │
│  │  Production Conversation Monitor  │  Cross-Tree Deployment Coord.│ │
│  └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.2 Technology Stack

|Component        |Technology                               |Rationale                           |
|------------------|-----------------------------------------|------------------------------------|
|Dashboard         |React 18 + TypeScript                    |ADK web UI compatibility            |
|Tree Visualization|D3.js (force-directed or tree layout)    |Agent tree node-link diagrams       |
|Charts            |Recharts                                 |Composable charting                 |
|Styling           |Tailwind CSS                             |Utility-first                       |
|API Server        |FastAPI (Python)                         |Same language as ADK                |
|Background Jobs   |Celery + Redis                           |Async parallel experiment execution |
|Database          |PostgreSQL 16                            |JSONB for flexible schemas          |
|Agent Library     |PostgreSQL + Git                         |Registry with version history       |
|Config Versioning |Git (bare repo)                          |Per-agent diffs, full tree snapshots|
|Proposer LLM      |Gemini 2.5 Pro                           |Best reasoning quality              |
|Eval LLM          |Gemini 2.5 Flash                         |Cost-efficient                      |
|ADK               |google-adk-python >= 1.0                 |Core framework                      |

-----

## 6. Non-Functional Requirements

### 6.1 Performance
- Scoped eval (15 cases, single specialist): < 45 seconds
- Full eval suite (100 cases, all levels): < 5 minutes
- Single experiment (propose + apply + scoped eval): < 2 minutes
- Wave (4 parallel branches, scoped): < 3 minutes
- Cross-tree validation (2 consuming trees): < 8 minutes

### 6.2 Scalability
- Agent trees with up to 20 agents and 3 levels of depth
- Agent Library with up to 50 shared agents
- Eval suites with up to 500 cases across all levels
- Training sessions with up to 500 experiments
- Concurrent optimization of up to 5 agent trees

### 6.3 Safety
- L4 (shared agent) changes require cross-tree validation before being kept — no exceptions
- L5 (structural) changes require human approval before deployment — the system can propose and evaluate, but the user must explicitly approve structural changes
- All agent configs are versioned in Git with full rollback capability per agent
- Secrets in tool definitions are redacted before being sent to the Proposer LLM

-----

## 7. Implementation Roadmap

### Milestone 1: Multi-Agent Eval Harness (Weeks 1-3)
- Tree Analyzer that parses ADK multi-agent hierarchies
- Multi-level eval generator (L1 specialist, L2 routing, L3 end-to-end)
- Scoped eval runner
- CLI: `autoagent import`, `autoagent evals generate`, `autoagent eval`

### Milestone 2: Agent Library + Cross-Tree (Weeks 4-5)
- Agent Library registry and consumer tracking
- Cross-tree validation runner (L4)
- CLI: `autoagent library register`, `autoagent library validate`

### Milestone 3: Multi-Level Experiment Loop (Weeks 6-9)
- Multi-Agent Proposer with level-aware hypothesis generation
- Scoped evaluation with regression checks
- Cross-tree validation for L4 changes
- Structural proposer (L5) with split/merge/add capabilities
- Research Memory with transferable patterns
- Wave-based parallel execution
- CLI: `autoagent train`

### Milestone 4: Web Dashboard (Weeks 10-13)
- Agent tree visualizer with per-agent scoring
- Health Scan with tree-level diagnostics
- Live training session with per-agent progress
- Morning Briefing with tree-level summary and routing visualization
- Before/After replays showing multi-agent conversations with handoff annotations
- Configuration wizard with scope selection

### Milestone 5: Deploy + Production Feedback (Weeks 14-16)
- Granular deployment (per-agent, per-tree, library agent)
- Canary deployment with per-agent monitoring
- Cross-tree deployment coordination for library agents
- Production conversation monitoring with per-agent failure attribution
- Auto-generated eval cases from production failures

-----

## 8. Open Questions and Risks

**Q1: How does the Single Parent Rule affect shared agents?**
ADK enforces that each agent instance has one parent. Library agents are reused as definitions, not instances — each consuming tree creates its own instance from the library definition. AutoAgent tracks the definition in the library and propagates changes to all instances.
Risk: drift between instances if trees customize the shared agent locally.
Mitigation: AutoAgent flags any local customization of library agents and suggests either updating the library or forking.

**Q2: Can the Proposer reliably target changes at the right level?**
Risk: The Proposer may make L1 changes when L3 changes are needed (treating a routing problem as a specialist problem).
Mitigation: The diagnostic explicitly identifies the root cause level for each opportunity, and the strategy.md guides the Proposer to target the right level. Track the Proposer's level accuracy over time.

**Q3: How expensive is cross-tree validation?**
Each L4 change requires running eval suites for every consuming tree. With 5 consuming trees and 30 cases each, that's 150 eval runs per experiment.
Mitigation: Use scoped evaluation — only run auth-related cases in each tree, not the full suite. Estimate: 2-3 minutes per L4 experiment instead of 15.

**Q4: When should the system propose structural changes (L5)?**
Risk: Structural changes are high-risk and easy to get wrong.
Mitigation: L5 is only activated when (a) explicitly enabled by the user, (b) improvement at other levels has plateaued, and (c) the diagnostic identifies a structural root cause. L5 changes require human approval before deployment.

**Q5: How does this integrate with CES Agent Studio's existing multi-agent tooling?**
Agent Studio already supports multi-agent design with a visual canvas. AutoAgent should import from and export to Agent Studio's format. The dashboard should be embeddable as a tab within Agent Studio, not a separate product. The tree visualizer should use the same visual language as Agent Studio's canvas.

-----

## Appendix A: ADK Multi-Agent Patterns Reference

AutoAgent supports all ADK multi-agent patterns:

|Pattern                 |ADK Implementation                            |AutoAgent Optimization Target                             |
|-----------------------|----------------------------------------------|----------------------------------------------------------|
|LLM-Driven Delegation  |`sub_agents` list on parent LlmAgent          |Specialist descriptions, parent instruction routing logic  |
|Explicit Invocation     |`AgentTool(agent=specialist)`                 |Tool descriptions, parent instruction for when to invoke   |
|Sequential Workflow     |`SequentialAgent(sub_agents=[a, b, c])`       |Order of agents, state passing between steps               |
|Parallel Workflow       |`ParallelAgent(sub_agents=[a, b])`            |Which tasks are independent, state key management          |
|Loop Workflow           |`LoopAgent(sub_agents=[writer, critic])`      |Loop termination criteria, refinement instructions         |
|Hierarchical Delegation|Nested agent trees (parent → mid-level → leaf)|Per-level routing, description clarity at each level       |
|Shared State            |`session.state['key']` read/write             |State key naming, what context to preserve across handoffs |

## Appendix B: Relationship to autoresearch

|autoresearch                    |AutoAgent Multi-Agent                                            |
|--------------------------------|-----------------------------------------------------------------|
|Single `train.py` to edit       |Multiple agent configs across a tree                             |
|One metric (`val_bpb`)          |Per-agent scores + routing accuracy + global composite           |
|One experiment scope            |Five optimization levels (L1-L5) with scoped evaluation          |
|One file, one agent edits       |Tree of agents, Proposer targets specific agents                 |
|No shared components            |Agent Library with cross-tree validation                         |
|Flat experiment log             |Hierarchical: per-agent scores within each experiment            |
|One research direction at a time|Multiple directions targeting different agents/levels in parallel|

-----

## Appendix C: Dashboard Visual Specification

### C.1 Design System

**Aesthetic**: "Observatory" — deep void backgrounds with luminous data. The metaphor is a mission control center for an agent fleet. Professional, calm, precise.

**Typography**: DM Mono (monospace, for data and labels) paired with Sora (geometric sans, for headings and body text). Never Inter, Roboto, or system fonts.

**Color Palette**:

|Token    |Hex    |Usage                                |
|---------|-------|-------------------------------------|
|Void     |#050510|Page background                      |
|Surface  |#0a0a1e|Card backgrounds                     |
|Border   |#161640|Borders, grid lines                  |
|Text     |#e4e4f0|Primary text                         |
|Text Soft|#8888aa|Secondary text                       |
|Text Dim |#444466|Tertiary text, labels                |
|Accent   |#5b6af0|Primary accent, orchestrator         |
|Green    |#36d8a0|Kept experiments, healthy scores     |
|Red      |#f06070|Reverted experiments, critical scores|
|Amber    |#f0b040|Warning scores, synthesis experiments|
|Blue     |#50a0f0|Billing agent, tool category         |
|Purple   |#a070f0|Tech support agent                   |
|Teal     |#40d0c0|Shared/library agents                |

**Agent Color Assignments** (consistent across all views):

|Agent           |Color           |Rationale          |
|----------------|----------------|--------------------|
|Orchestrator    |Accent (#5b6af0)|Central control     |
|AuthAgent       |Teal (#40d0c0)  |Shared agent marker |
|BillingAgent    |Blue (#50a0f0)  |Financial domain    |
|RefundAgent     |Green (#36d8a0) |Resolution domain   |
|TechSupportAgent|Purple (#a070f0)|Technical domain    |
|EscalationAgent |Amber (#f0b040) |Escalation/warning  |

These colors are used in the tree visualizer, routing flow, experiment pills, and conversation replay bubbles.

### C.2 Agent Tree Visualizer

**Purpose**: The primary diagnostic view. Shows the entire agent hierarchy with per-agent scores color-coded by health status.

**Implementation**: Pure SVG with custom layout algorithm. No external library required.

**Layout Algorithm**:
1. Root agent positioned at top center
1. First-level children evenly distributed horizontally below root
1. Second-level children positioned below their parent, evenly spaced within the parent's horizontal span
1. Curved Bézier edges connect parent to child (vertical cubic curves)
1. Shared agents have dashed edge borders

**Node Rendering**:
- Circle radius by depth: root=28px, depth-1=22px, depth-2=18px
- Fill: Surface color
- Stroke: Color-coded by score (green ≥80%, amber 65-79%, red <65%)
- Inner text: Score percentage in monospace
- Label below: Agent name (abbreviated)
- Role badge below label: "ORCHESTRATOR", "SHARED", etc.
- Shared agent indicator: Small teal dot in upper-right of node
- Radial gradient glow behind each node in the node's score color

**Interactions**:
- Click any node to select it → detail panel appears
- Before/After toggle switches all scores between baseline and current
- Hover shows tooltip with agent name, full scores, and role

**Detail Panel** (shown when an agent is selected):
- Agent name and role badge
- Before/After score comparison with large numerals
- Improvement progress bar
- If shared: library ID, list of consuming trees, cross-tree validation notice
- List of experiments that targeted this agent

### C.3 Routing Flow Diagram

**Purpose**: Shows how the orchestrator distributes conversations across specialists, highlighting misroutes.

**Implementation**: Horizontal bar chart with color-coded segments. Each bar represents a routing path from user query to specialist.

**Layout**:
- Before/After shown side by side in two cards
- Each card shows:
  - Label and overall accuracy percentage (large, color-coded)
  - Stacked horizontal bars, one per routing path
  - Correct routes: filled in the specialist's assigned color
  - Incorrect routes: filled in red with a cross-reference label ("→ should be Billing")
  - Bars are proportional to query volume

**Data Requirements**:
- Per-specialist: count of correctly routed queries, count of incorrectly routed queries
- For each misroute: the intended target specialist
- Total query count for percentage calculation

**Color Coding**:
- Correct routes: specialist's assigned color (see Agent Color Assignments)
- Incorrect routes: Red (#f06070) with 40% opacity, red border
- Accuracy label: Green if ≥90%, Amber if ≥70%, Red if <70%

### C.4 Multi-Agent Conversation Replay

**Purpose**: The critical trust-building element. Shows a before/after conversation with agent labels, handoff annotations, and quality indicators.

**Layout**: Two-column modal overlay. Left: Before conversation. Right: After conversation.

**Message Types**:
- **User messages**: Right-aligned, dark blue-gray background (#18183a), "CUSTOMER" label
- **Agent messages**: Left-aligned, surface background, with agent identity header showing:
  - Colored dot matching agent's assigned color
  - Agent name in monospace
  - Role badge if system/routing message
- **System/Routing messages**: Left-aligned, monospace font, void background, smaller font size. Shows routing decisions and state management.

**Quality Annotations**:
- Green border + "✓" prefix on messages demonstrating improved behavior
- Red border + "✗" prefix on messages demonstrating problems
- Annotation text below each annotated message in monospace, explaining what's good/bad

**Handoff Visualization**: When the conversation transfers between agents, the new agent's identity header acts as a visual separator. In the "before" column, misroutes are highlighted with red annotation. In the "after" column, correct routes are highlighted with green annotation.

### C.5 Morning Briefing Layout

**Top to bottom, the briefing consists of**:

1. **Hero Section**: Centered. Large animated improvement percentage (e.g., "+35%") with gradient text (green → accent). Below: starting score → ending score, experiment count, wave count.

1. **Per-Agent Stats Row**: 5-column grid. One card per key metric: Routing Accuracy, top specialist improvements, cross-tree validation status. Each card has a label, value, and agent color accent.

1. **Progress Curve + Agent Tree**: Two-column grid.
   - Left: Area chart showing composite score over experiments. Green dots for kept, red for reverted. Click any dot for tooltip with hypothesis, level, target agent.
   - Right: Agent Tree Visualizer with before/after toggle. Shows the agent hierarchy with color-coded health scores.

1. **Routing Before/After**: Two-column grid. Side-by-side routing flow diagrams showing how misroutes were eliminated.

1. **Top Changes**: Single-column card. Ranked list of the 3-5 most impactful experiments. Each entry shows: hypothesis, optimization level pill (e.g., "L3 · Orchestrator"), impact points, and a "See before/after" button for the top entry.

1. **Cross-Tree Validation Summary**: Single-column card. Shows any shared agent changes attempted, with per-tree results. Reverted cross-tree changes are shown with explanation.

1. **Deploy CTA**: Full-width card with gradient glow. "Approve & Deploy" primary button, "Review All Diffs" secondary button. Subtitle notes granular deployment options.

### C.6 Training Session Live View

**Layout**:
1. **Progress chart**: Real-time area chart with dots appearing as experiments complete
1. **Current wave**: Shows active branches with hypotheses, target agents, and levels
1. **Wave timeline**: Expandable accordion showing completed waves with per-branch results
1. **Research status**: Live narration of the Proposer's reasoning (streaming text)
1. **Diminishing returns alert**: Banner notification when improvement rate slows

### C.7 Experiment Detail View

**For each experiment, the detail panel shows**:
- Hypothesis title and rationale
- Target agent and optimization level (with color-coded pills)
- Blast radius: which agents could be affected
- Per-dimension scores (radar chart)
- Per-agent score deltas (small bar chart showing which agents improved/regressed)
- Config diff: syntax-highlighted unified diff showing exact changes
- For L4 experiments: cross-tree validation results with per-tree pass/fail
- For synthesis experiments: which parent experiments were combined

### C.8 Responsive Behavior

The dashboard targets desktop viewports (1280px+). On smaller screens:
- Two-column layouts collapse to single column
- Agent tree scales via SVG viewBox
- Routing flow diagrams stack vertically
- Conversation replay modal becomes full-screen
