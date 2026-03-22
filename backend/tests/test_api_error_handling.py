"""API error-handling regression tests."""

from __future__ import annotations


def _create_session_context(client) -> str:
    """Create minimal tree/suite/session fixtures for experiment endpoint tests."""

    tree_response = client.post(
        "/api/trees/",
        json={
            "name": "Customer Support",
            "source_type": "adk_python",
            "source_ref": "samples/root.py",
            "tree_profile": {"root_agent": {"name": "Root", "sub_agents": []}},
        },
    )
    tree_id = tree_response.json()["id"]

    suite_response = client.post(
        "/api/evals/suites",
        json={
            "tree_id": tree_id,
            "name": "Default",
            "category_weights": {},
            "safety_floor": 0.9,
            "routing_floor": 0.7,
        },
    )
    suite_id = suite_response.json()["id"]

    session_response = client.post(
        "/api/sessions/",
        json={
            "tree_id": tree_id,
            "eval_suite_id": suite_id,
            "strategy_md": "",
            "allowed_levels": ["L1", "L3"],
            "config": {},
        },
    )
    return session_response.json()["id"]


def test_create_tree_rejects_invalid_source_type(client) -> None:
    """Tree create endpoint should reject unsupported source types."""

    response = client.post(
        "/api/trees/",
        json={
            "name": "Invalid Tree",
            "source_type": "not-a-real-source",
            "source_ref": "samples/root.py",
            "tree_profile": {"root_agent": {"name": "Root", "sub_agents": []}},
        },
    )

    assert response.status_code == 400
    assert "Invalid source_type" in response.json()["detail"]


def test_create_session_requires_existing_tree(client) -> None:
    """Session create endpoint should return 404 when tree does not exist."""

    response = client.post(
        "/api/sessions/",
        json={
            "tree_id": "missing-tree",
            "eval_suite_id": "missing-suite",
            "strategy_md": "",
            "allowed_levels": ["L1"],
            "config": {},
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Tree not found"


def test_create_eval_case_requires_existing_suite(client) -> None:
    """Eval case create endpoint should return 404 when suite does not exist."""

    response = client.post(
        "/api/evals/cases",
        json={
            "suite_id": "missing-suite",
            "level": "L1",
            "source": "auto_generated",
            "enabled": True,
            "scenario_json": {},
            "expected_agent_sequence": [],
            "expected_trajectory": [],
            "expected_response": "",
            "mock_tool_outputs": {},
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Eval suite not found"


def test_propose_wave_rejects_non_positive_branch_count(client) -> None:
    """Hypothesis proposal endpoint should validate branch count range."""

    session_id = _create_session_context(client)
    response = client.post(f"/api/experiments/propose/{session_id}?branch_count=0")

    assert response.status_code == 400
    assert response.json()["detail"] == "branch_count must be between 1 and 26"
