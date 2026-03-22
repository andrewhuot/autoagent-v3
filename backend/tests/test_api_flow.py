"""Integration-style API tests for primary resources."""

from __future__ import annotations


def test_create_and_list_tree(client) -> None:
    """Tree create endpoint should persist and list returned records."""

    payload = {
        "name": "Customer Support",
        "source_type": "adk_python",
        "source_ref": "samples/root.py",
        "tree_profile": {"root_agent": {"name": "Root", "sub_agents": []}},
    }

    create_response = client.post("/api/trees/", json=payload)
    assert create_response.status_code == 200

    list_response = client.get("/api/trees/")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1


def test_session_proposal_endpoint_returns_hypotheses(client) -> None:
    """Session propose endpoint should return at least one hypothesis branch."""

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
        json={"tree_id": tree_id, "name": "Default", "category_weights": {}, "safety_floor": 0.9, "routing_floor": 0.7},
    )
    suite_id = suite_response.json()["id"]

    session_response = client.post(
        "/api/sessions/",
        json={"tree_id": tree_id, "eval_suite_id": suite_id, "strategy_md": "", "allowed_levels": ["L1", "L3"], "config": {}},
    )
    session_id = session_response.json()["id"]

    proposal = client.post(f"/api/experiments/propose/{session_id}")
    assert proposal.status_code == 200
    assert proposal.json()["hypotheses"]
