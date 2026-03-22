"""API smoke tests."""

from __future__ import annotations


def test_health_endpoint_returns_ok(client) -> None:
    """Health endpoint should return a simple liveness payload."""

    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
