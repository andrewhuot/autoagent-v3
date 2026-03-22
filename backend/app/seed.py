"""Seed script for demo-ready AutoAgent sample data."""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.database import SessionLocal, init_db
from app.models.entities import (
    Agent,
    AgentLibraryConsumer,
    AgentTree,
    Deployment,
    EvalCase,
    EvalSuite,
    Experiment,
    ResearchMemory,
    TrainingSession,
)
from app.models.enums import (
    AgentRole,
    AgentType,
    DeploymentMode,
    DeploymentScope,
    DeploymentStatus,
    EvalLevel,
    EvalSource,
    ExperimentStatus,
    SessionStatus,
    SourceType,
)


def _example_tree_profile() -> dict:
    return {
        "root_agent": {
            "name": "CustomerSupportOrchestrator",
            "type": "llm_agent",
            "model": "gemini-2.5-flash",
            "instruction": "Route customer intents to the right specialist and preserve context.",
            "routing_mode": "llm_driven_transfer",
            "sub_agents": [
                {
                    "name": "AuthAgent",
                    "type": "llm_agent",
                    "is_library_agent": True,
                    "library_id": "auth-agent-v2",
                    "consuming_trees": ["customer_support", "account_management"],
                    "description": "Verifies customer identity",
                    "instruction": "Authenticate customer before sensitive actions.",
                    "tools": [{"name": "verify_email"}, {"name": "verify_phone"}],
                    "sub_agents": [],
                },
                {
                    "name": "BillingAgent",
                    "type": "llm_agent",
                    "description": "Handles account charges and invoice disputes",
                    "instruction": "Resolve billing disputes and duplicate charges.",
                    "tools": [{"name": "lookup_invoice"}, {"name": "charge_dispute"}],
                    "sub_agents": [],
                },
                {
                    "name": "RefundAgent",
                    "type": "llm_agent",
                    "description": "Handles returns and refunds",
                    "instruction": "Guide customer through refund process.",
                    "tools": [{"name": "lookup_order"}, {"name": "issue_refund"}],
                    "sub_agents": [
                        {"name": "EligibilityCheck", "type": "llm_agent"},
                        {"name": "RefundExecution", "type": "llm_agent"},
                    ],
                },
                {
                    "name": "TechSupportAgent",
                    "type": "llm_agent",
                    "description": "Resolves technical and product issues",
                    "instruction": "Diagnose and solve technical issues quickly.",
                    "tools": [{"name": "search_kb"}, {"name": "reset_account"}],
                    "sub_agents": [],
                },
                {
                    "name": "EscalationAgent",
                    "type": "llm_agent",
                    "description": "Escalates complex or sensitive situations",
                    "instruction": "Escalate high-risk issues to human support.",
                    "tools": [{"name": "create_escalation_ticket"}],
                    "sub_agents": [],
                },
            ],
            "workflow_agents": [
                {
                    "name": "RefundFlow",
                    "type": "sequential_agent",
                    "children": ["EligibilityCheck", "RefundExecution"],
                }
            ],
        },
        "total_agents": 8,
        "tree_depth": 3,
        "library_agents": ["AuthAgent"],
        "tools_total": 14,
        "routing_paths": [
            "root -> AuthAgent",
            "root -> BillingAgent",
            "root -> RefundAgent -> EligibilityCheck -> RefundExecution",
            "root -> TechSupportAgent",
            "root -> EscalationAgent",
        ],
    }


def seed_database(db: Session) -> dict:
    """Populate the database with the canonical customer support sample."""

    existing = db.query(AgentTree).filter(AgentTree.name == "Customer Support").first()
    if existing:
        return {"seeded": False, "tree_id": existing.id, "reason": "already_exists"}

    # ── Primary tree ──
    tree = AgentTree(
        name="Customer Support",
        description="Multi-agent customer support tree handling billing, refunds, tech support, and escalations.",
        owner="team-cx",
        source_type=SourceType.ADK_PYTHON,
        source_ref="samples/customer_support/root_agent.py",
        tree_profile=_example_tree_profile(),
        score=87,
        score_before=62,
        status="idle",
    )
    db.add(tree)
    db.flush()

    # ── Additional trees (for tree list page) ──
    tree2 = AgentTree(
        name="Sales Qualification v2",
        description="Lead qualification and routing pipeline with intent scoring and handoff to sales reps.",
        owner="team-sales",
        source_type=SourceType.ADK_PYTHON,
        source_ref="samples/sales_qualification/root_agent.py",
        tree_profile={},
        score=79,
        score_before=71,
        status="training",
    )
    tree3 = AgentTree(
        name="Onboarding Assistant v1",
        description="New user onboarding flow with guided setup, feature tours, and activation tracking.",
        owner="team-growth",
        source_type=SourceType.ADK_PYTHON,
        source_ref="samples/onboarding/root_agent.py",
        tree_profile={},
        score=73,
        score_before=65,
        status="idle",
    )
    db.add_all([tree2, tree3])
    db.flush()

    # ── Agents for secondary trees (so agent_count is non-zero) ──
    for t, specs in [
        (tree2, [
            ("SalesOrchestrator", AgentRole.ORCHESTRATOR, "Routes leads to qualification stages"),
            ("LeadScorer", AgentRole.SPECIALIST, "Scores inbound leads by intent signals"),
            ("QualificationAgent", AgentRole.SPECIALIST, "Runs BANT qualification framework"),
            ("HandoffAgent", AgentRole.SPECIALIST, "Transfers qualified leads to sales reps"),
        ]),
        (tree3, [
            ("OnboardingOrchestrator", AgentRole.ORCHESTRATOR, "Guides new users through setup"),
            ("FeatureTourAgent", AgentRole.SPECIALIST, "Walks users through key features"),
            ("ActivationAgent", AgentRole.SPECIALIST, "Tracks and nudges activation milestones"),
        ]),
    ]:
        for name, role, desc in specs:
            db.add(Agent(
                tree_id=t.id, name=name, agent_type=AgentType.LLM_AGENT,
                role=role, instruction=f"{desc}.", description=desc,
                model="gemini-2.5-flash", tools=[], config_snapshot=f"{name}_v1",
                score=t.score + (hash(name) % 5 - 2), score_before=t.score_before + (hash(name) % 4 - 1),
            ))
    db.flush()

    # ── Orchestrator ──
    orchestrator = Agent(
        tree_id=tree.id,
        name="CustomerSupportOrchestrator",
        agent_type=AgentType.LLM_AGENT,
        role=AgentRole.ORCHESTRATOR,
        instruction="Route customer needs to specialists and preserve context.",
        description="Primary support orchestrator",
        model="gemini-2.5-flash",
        tools=[],
        config_snapshot="orchestrator_config_v1",
        score=88,
        score_before=62,
    )
    db.add(orchestrator)
    db.flush()

    # ── Specialist agents ──
    # (name, role, description, tools, library_id, score, score_before)
    agent_specs = [
        ("AuthAgent", AgentRole.SHARED, "Verifies identity", [{"name": "verify_email"}, {"name": "verify_phone"}], "auth-agent-v2", 91, 74),
        ("BillingAgent", AgentRole.SPECIALIST, "Handles billing and disputes", [{"name": "lookup_invoice"}, {"name": "charge_dispute"}], None, 85, 58),
        ("RefundAgent", AgentRole.SPECIALIST, "Handles returns and refunds", [{"name": "lookup_order"}, {"name": "issue_refund"}], None, 82, 55),
        ("TechSupportAgent", AgentRole.SPECIALIST, "Handles technical issues", [{"name": "search_kb"}, {"name": "reset_account"}], None, 90, 67),
        ("EscalationAgent", AgentRole.SPECIALIST, "Escalates critical issues", [{"name": "create_escalation_ticket"}], None, 78, 60),
        ("EligibilityCheck", AgentRole.SPECIALIST, "Checks refund eligibility", [{"name": "lookup_order"}], None, 84, 52),
        ("RefundExecution", AgentRole.SPECIALIST, "Executes approved refunds", [{"name": "issue_refund"}], None, 80, 50),
    ]

    created_agents: dict[str, Agent] = {}
    for name, role, description, tools, library_id, score, score_before in agent_specs:
        parent_id = orchestrator.id if name not in {"EligibilityCheck", "RefundExecution"} else None
        agent = Agent(
            tree_id=tree.id,
            parent_agent_id=parent_id,
            library_id=library_id,
            name=name,
            agent_type=AgentType.LLM_AGENT,
            role=role,
            instruction=f"{description}.",
            description=description,
            model="gemini-2.5-flash",
            tools=tools,
            config_snapshot=f"{name}_config_v1",
            score=score,
            score_before=score_before,
        )
        db.add(agent)
        db.flush()
        created_agents[name] = agent

    created_agents["EligibilityCheck"].parent_agent_id = created_agents["RefundAgent"].id
    created_agents["RefundExecution"].parent_agent_id = created_agents["RefundAgent"].id

    db.add(
        AgentLibraryConsumer(
            library_agent_id=created_agents["AuthAgent"].id,
            consumer_tree_id=tree.id,
            integration_point="CustomerSupportOrchestrator",
        )
    )

    # ── Eval suite ──
    suite = EvalSuite(
        tree_id=tree.id,
        name="Customer Support Default Suite",
        category_weights={"routing": 0.3, "task_completion": 0.35, "safety": 0.2, "efficiency": 0.15},
        safety_floor=0.9,
        routing_floor=0.7,
    )
    db.add(suite)
    db.flush()

    eval_cases = [
        EvalCase(
            suite_id=suite.id,
            level=EvalLevel.ROUTING,
            target_agent_id=created_agents["BillingAgent"].id,
            category="routing",
            source=EvalSource.AUTO_GENERATED,
            scenario_json={"query": "I was charged twice for my subscription last month"},
            expected_agent_sequence=["CustomerSupportOrchestrator", "BillingAgent"],
            expected_trajectory=[{"agent": "CustomerSupportOrchestrator", "action": "transfer_to", "target": "BillingAgent"}],
        ),
        EvalCase(
            suite_id=suite.id,
            level=EvalLevel.SPECIALIST_UNIT,
            target_agent_id=created_agents["RefundAgent"].id,
            category="process",
            source=EvalSource.AUTO_GENERATED,
            scenario_json={"query": "I want a refund for order ORD-102"},
            expected_trajectory=[{"tool": "lookup_order"}, {"tool": "issue_refund"}],
        ),
        EvalCase(
            suite_id=suite.id,
            level=EvalLevel.END_TO_END,
            target_agent_id=created_agents["RefundAgent"].id,
            category="integration",
            source=EvalSource.AUTO_GENERATED,
            scenario_json={"goal": "Customer CUST001 wants a refund for order ORD-102"},
            expected_agent_sequence=[
                "CustomerSupportOrchestrator",
                "AuthAgent",
                "RefundAgent",
                "EligibilityCheck",
                "RefundExecution",
            ],
        ),
        EvalCase(
            suite_id=suite.id,
            level=EvalLevel.CROSS_TREE,
            target_agent_id=created_agents["AuthAgent"].id,
            category="shared_agent",
            source=EvalSource.AUTO_GENERATED,
            scenario_json={"query": "Validate auth behavior across support/account trees"},
            expected_agent_sequence=["AuthAgent"],
        ),
    ]
    db.add_all(eval_cases)

    # ── Training session ──
    base_time = datetime.utcnow() - timedelta(hours=8)
    session = TrainingSession(
        tree_id=tree.id,
        eval_suite_id=suite.id,
        strategy_md="## Research Plan\n\n### CustomerSupportOrchestrator [L3 — HIGH PRIORITY]\nImprove billing/refund routing boundaries.\n\n### RefundAgent [L1 — HIGH PRIORITY]\nAdd explicit refund decision tree.\n\n### BillingAgent [L1 — MEDIUM PRIORITY]\nAdd dispute handling scenarios.\n",
        allowed_levels=["L1", "L2", "L3", "L4"],
        config={"duration_hours": 8, "parallel_branches": 3, "exploration_style": "balanced"},
        status=SessionStatus.COMPLETED,
        baseline_scores={"overall": 0.62},
        final_scores={
            "overall": 0.87,
            "per_agent_deltas": [
                {"agent": "CustomerSupportOrchestrator", "before": 0.62, "after": 0.88, "delta": 0.26},
                {"agent": "AuthAgent", "before": 0.74, "after": 0.91, "delta": 0.17},
                {"agent": "BillingAgent", "before": 0.58, "after": 0.85, "delta": 0.27},
                {"agent": "RefundAgent", "before": 0.55, "after": 0.82, "delta": 0.27},
                {"agent": "TechSupportAgent", "before": 0.67, "after": 0.90, "delta": 0.23},
                {"agent": "EscalationAgent", "before": 0.60, "after": 0.78, "delta": 0.18},
                {"agent": "EligibilityCheck", "before": 0.52, "after": 0.84, "delta": 0.32},
                {"agent": "RefundExecution", "before": 0.50, "after": 0.80, "delta": 0.30},
            ],
            "routing_before_after": {
                "before": {"accuracy": 0.55},
                "after": {"accuracy": 0.88},
            },
            "shared_validation": [
                {
                    "agent": "AuthAgent",
                    "results": [
                        {"tree": "CustomerSupport", "passed": True, "delta": 0.04},
                        {"tree": "AccountManagement", "passed": True, "delta": 0.02},
                    ],
                }
            ],
        },
        total_experiments=6,
        total_waves=3,
        started_at=base_time,
        completed_at=base_time + timedelta(hours=8),
    )
    db.add(session)
    db.flush()

    # ── 6 experiments across 3 waves ──
    experiments = [
        Experiment(
            session_id=session.id,
            wave_number=1,
            branch_id="A",
            target_agent_id=created_agents["BillingAgent"].id,
            optimization_level="L1",
            blast_radius=[created_agents["BillingAgent"].id],
            hypothesis_title="Refined prompt with explicit invoice lookup instructions improves billing accuracy",
            hypothesis_rationale="BillingAgent frequently fails to look up invoices before responding, leading to generic answers.",
            config_diff="--- billing_agent\n+++ billing_agent\n@@ instruction\n- Handle billing inquiries...\n+ Handle billing inquiries. ALWAYS look up the customer's invoice before responding...",
            per_agent_config_diffs={"BillingAgent": "instruction expanded with invoice lookup requirement"},
            status=ExperimentStatus.KEPT,
            scores={"trajectory": 0.81, "response": 0.77, "task_completion": 0.82, "safety": 0.93, "efficiency": 0.73, "routing_accuracy": 0.76, "composite": 0.79},
            per_agent_scores={"BillingAgent": {"before": 0.58, "after": 0.79}},
            routing_accuracy=0.76,
            eval_scope_used={"primary": ["unit_billing_*"], "regression": ["routing_*"]},
            impact_points=8.2,
            summary="Billing accuracy dramatically improved with explicit invoice lookup requirement.",
            tokens_used=14500,
            duration_ms=92000,
        ),
        Experiment(
            session_id=session.id,
            wave_number=1,
            branch_id="B",
            target_agent_id=created_agents["TechSupportAgent"].id,
            optimization_level="L2",
            blast_radius=[created_agents["TechSupportAgent"].id],
            hypothesis_title="Adding diagnostic tool chain improves first-contact resolution",
            hypothesis_rationale="TechSupport resolves only 45% of issues on first contact. Adding structured diagnostic flow should help.",
            config_diff="--- tech_support\n+++ tech_support\n@@ tools\n- [diagnose, check_status]\n+ [diagnose, check_status, run_test, auto_fix]",
            per_agent_config_diffs={"TechSupportAgent": "tools expanded with run_test and auto_fix"},
            status=ExperimentStatus.KEPT,
            scores={"trajectory": 0.86, "response": 0.82, "task_completion": 0.88, "safety": 0.92, "efficiency": 0.70, "routing_accuracy": 0.78, "composite": 0.84},
            per_agent_scores={"TechSupportAgent": {"before": 0.67, "after": 0.84}},
            routing_accuracy=0.78,
            eval_scope_used={"primary": ["unit_techsupport_*"], "regression": ["routing_*"]},
            impact_points=7.5,
            summary="First-contact resolution improved with diagnostic chain.",
            tokens_used=13200,
            duration_ms=85000,
        ),
        Experiment(
            session_id=session.id,
            wave_number=2,
            branch_id="A",
            target_agent_id=orchestrator.id,
            optimization_level="L3",
            blast_radius=[orchestrator.id, created_agents["BillingAgent"].id, created_agents["RefundAgent"].id],
            hypothesis_title="Intent classifier with confidence thresholds reduces misrouting",
            hypothesis_rationale="20% of conversations are routed to the wrong specialist. Adding confidence-based fallback should improve.",
            config_diff="--- orchestrator\n+++ orchestrator\n@@ routing\n- general keyword matching\n+ intent classifier with 0.85 confidence threshold and ask_clarification fallback",
            per_agent_config_diffs={
                "CustomerSupportOrchestrator": "routing strategy changed to classifier",
                "BillingAgent": "description refined for disambiguation",
                "RefundAgent": "description refined for disambiguation",
            },
            status=ExperimentStatus.KEPT,
            scores={"trajectory": 0.90, "response": 0.85, "task_completion": 0.88, "safety": 0.93, "efficiency": 0.75, "routing_accuracy": 0.88, "composite": 0.88},
            per_agent_scores={
                "CustomerSupportOrchestrator": {"before": 0.64, "after": 0.88},
                "BillingAgent": {"before": 0.79, "after": 0.82},
                "RefundAgent": {"before": 0.56, "after": 0.60},
            },
            routing_accuracy=0.88,
            eval_scope_used={"primary": ["routing_*", "e2e_*"], "regression": ["specialist_unit_*"]},
            impact_points=9.8,
            summary="Routing confusion reduced sharply with classifier + confidence threshold.",
            tokens_used=18500,
            duration_ms=120000,
        ),
        Experiment(
            session_id=session.id,
            wave_number=2,
            branch_id="B",
            target_agent_id=created_agents["RefundAgent"].id,
            optimization_level="L1",
            blast_radius=[created_agents["RefundAgent"].id],
            hypothesis_title="Adding eligibility check enforcement to refund prompt",
            hypothesis_rationale="RefundAgent sometimes processes refunds without checking eligibility first.",
            config_diff="--- refund_agent\n+++ refund_agent\n@@ instruction\n- Process refund requests...\n+ Process refund requests. MUST check eligibility before processing any refund. NEVER skip steps.",
            per_agent_config_diffs={"RefundAgent": "instruction expanded with eligibility enforcement"},
            status=ExperimentStatus.KEPT,
            scores={"trajectory": 0.82, "response": 0.78, "task_completion": 0.80, "safety": 0.94, "efficiency": 0.71, "routing_accuracy": 0.78, "composite": 0.78},
            per_agent_scores={"RefundAgent": {"before": 0.56, "after": 0.78}},
            routing_accuracy=0.78,
            eval_scope_used={"primary": ["unit_refund_*", "e2e_refund_*"], "regression": ["routing_*"]},
            impact_points=8.6,
            summary="Eligibility compliance improved and refund success rate increased.",
            tokens_used=13200,
            duration_ms=85000,
        ),
        Experiment(
            session_id=session.id,
            wave_number=3,
            branch_id="A",
            target_agent_id=created_agents["AuthAgent"].id,
            optimization_level="L4",
            blast_radius=[created_agents["AuthAgent"].id],
            hypothesis_title="Shared auth agent library update with stricter MFA flow",
            hypothesis_rationale="AuthAgent shared across trees. Stricter MFA improves security scores across all consumers.",
            config_diff="--- auth_agent\n+++ auth_agent\n@@ instruction\n+ Always require MFA for sensitive actions. Support TOTP, SMS, and email verification methods.",
            per_agent_config_diffs={"AuthAgent": "MFA enforcement added"},
            status=ExperimentStatus.KEPT,
            scores={"trajectory": 0.90, "response": 0.85, "task_completion": 0.88, "safety": 0.96, "efficiency": 0.76, "routing_accuracy": 0.88, "composite": 0.91},
            per_agent_scores={"AuthAgent": {"before": 0.74, "after": 0.91}},
            routing_accuracy=0.88,
            cross_tree_results={
                "Sales Qualification v2": {"passed": True, "baseline": 0.71, "candidate": 0.73, "delta": 0.02},
                "Onboarding Assistant v1": {"passed": True, "baseline": 0.65, "candidate": 0.66, "delta": 0.01},
            },
            eval_scope_used={"primary": ["cross_tree_auth_*"], "regression": ["all"]},
            impact_points=6.8,
            summary="Auth security improved across all consuming trees without regressions.",
            tokens_used=22000,
            duration_ms=145000,
        ),
        Experiment(
            session_id=session.id,
            wave_number=3,
            branch_id="B",
            target_agent_id=created_agents["EscalationAgent"].id,
            optimization_level="L2",
            blast_radius=[created_agents["EscalationAgent"].id],
            hypothesis_title="Priority scoring for escalation triage",
            hypothesis_rationale="EscalationAgent treats all escalations equally. Adding priority scoring should improve response times.",
            config_diff="--- escalation_agent\n+++ escalation_agent\n@@ tools\n- [escalate_to_human]\n+ [escalate_to_human, score_priority, auto_triage]",
            per_agent_config_diffs={"EscalationAgent": "tools expanded with priority scoring"},
            status=ExperimentStatus.REVERTED,
            scores={"trajectory": 0.50, "response": 0.54, "task_completion": 0.48, "safety": 0.82, "efficiency": 0.48, "routing_accuracy": 0.78, "composite": 0.52},
            per_agent_scores={"EscalationAgent": {"before": 0.60, "after": 0.52}},
            routing_accuracy=0.78,
            eval_scope_used={"primary": ["unit_escalation_*"], "regression": ["routing_*"]},
            impact_points=-3.2,
            summary="Priority scoring degraded triage quality. Reverted.",
            tokens_used=11000,
            duration_ms=72000,
        ),
    ]
    db.add_all(experiments)
    db.flush()

    # ── Research memory entries ──
    memory_entries = [
        ResearchMemory(
            session_id=session.id,
            experiment_id=experiments[0].id,
            target_agent_id=created_agents["BillingAgent"].id,
            level="L1",
            insight="Explicit tool usage instructions in specialist prompts dramatically improve accuracy.",
            reusable_pattern="For any specialist with lookup tools, explicitly instruct to ALWAYS use them before responding.",
            anti_pattern="Relying on implicit tool usage without explicit instruction",
            transferable_to=[created_agents["RefundAgent"].id, created_agents["TechSupportAgent"].id],
            tags=["specialist", "tool-usage", "instruction-design"],
        ),
        ResearchMemory(
            session_id=session.id,
            experiment_id=experiments[3].id,
            target_agent_id=created_agents["RefundAgent"].id,
            level="L1",
            insight="Structured decision trees reduce step-skipping in specialist workflows.",
            reusable_pattern="For process-heavy specialists, encode ordered steps with explicit non-skippable constraints.",
            anti_pattern="Vague high-level instruction with no ordered checks",
            transferable_to=[created_agents["BillingAgent"].id, created_agents["TechSupportAgent"].id],
            tags=["specialist", "workflow", "instruction-design"],
        ),
    ]
    db.add_all(memory_entries)

    # ── Deployment record ──
    db.add(
        Deployment(
            session_id=session.id,
            scope=DeploymentScope.FULL_TREE,
            target_agent_ids=[a.id for a in created_agents.values()],
            mode=DeploymentMode.CANARY,
            canary_percentage=10,
            status=DeploymentStatus.ACTIVE,
            canary_score=89,
            target_score=85,
            approved_by="andrew@autoagent.dev",
            rollback_configs={created_agents["RefundAgent"].id: "RefundAgent_config_v0"},
            cross_tree_health_checks={},
        )
    )

    db.commit()
    return {"seeded": True, "tree_id": tree.id, "session_id": session.id, "agents": len(created_agents) + 1}


def main() -> None:
    """Initialize DB and seed sample records."""

    init_db()
    with SessionLocal() as db:
        result = seed_database(db)
    print(result)


if __name__ == "__main__":
    main()
