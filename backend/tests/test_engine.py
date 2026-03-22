"""Core engine behavior tests."""

from __future__ import annotations

from app.engine import MultiAgentProposer, MultiLevelEvalGenerator, ScopedEvalRunner, TreeAnalyzer


def test_tree_analyzer_builds_profile_with_depth_and_paths() -> None:
    """Analyzer should report total agents, depth, and routing paths."""

    root = {
        "name": "Root",
        "type": "llm_agent",
        "tools": [],
        "sub_agents": [
            {"name": "AuthAgent", "type": "llm_agent", "is_library_agent": True, "tools": []},
            {
                "name": "RefundAgent",
                "type": "llm_agent",
                "tools": [],
                "sub_agents": [{"name": "RefundExecution", "type": "llm_agent", "tools": []}],
            },
        ],
    }

    profile = TreeAnalyzer().analyze(root).profile

    assert profile["total_agents"] == 4
    assert profile["tree_depth"] == 3
    assert "AuthAgent" in profile["library_agents"]
    assert any("RefundExecution" in path for path in profile["routing_paths"])


def test_eval_generator_outputs_all_levels() -> None:
    """Eval generator should produce specialist/routing/e2e/cross-tree case lists."""

    profile = {
        "root_agent": {
            "name": "Root",
            "sub_agents": [{"name": "BillingAgent", "type": "llm_agent"}],
        },
        "library_agents": ["AuthAgent"],
    }

    result = MultiLevelEvalGenerator().generate(profile)

    assert set(result.keys()) == {"specialist_unit", "routing", "end_to_end", "cross_tree"}
    assert result["specialist_unit"]
    assert result["cross_tree"]


def test_proposer_respects_allowed_levels() -> None:
    """Proposer should only emit opportunities in allowed level set when present."""

    diagnostic = {
        "opportunities": [
            {"level": "L3", "target_agent": "Orchestrator", "title": "routing"},
            {"level": "L1", "target_agent": "RefundAgent", "title": "refund flow"},
        ]
    }

    result = MultiAgentProposer().propose(diagnostic, allowed_levels=["L1"], branch_count=2)
    levels = [item["level"] for item in result["hypotheses"]]
    assert levels == ["L1"]


def test_scoped_eval_runner_returns_level_specific_scope() -> None:
    """Scoped runner should return routing-heavy scope for L3 changes."""

    payload = ScopedEvalRunner().run(base_score=0.62, lift=0.04, level="L3")

    assert payload["score_after"] > payload["score_before"]
    assert "routing:all" in payload["scope"]["primary"]
