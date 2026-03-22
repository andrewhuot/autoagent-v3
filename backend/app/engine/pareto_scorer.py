"""Pareto and weighted scoring helpers for experiment ranking."""

from __future__ import annotations


class ParetoScorer:
    """Combines multi-dimensional metrics into impact points with constraints."""

    def score(self, metrics: dict[str, float]) -> dict:
        """Calculate weighted impact while enforcing safety and routing floors."""

        safety = metrics.get("safety", 0.0)
        routing = metrics.get("routing_accuracy", 0.0)

        constraints_ok = safety >= 0.90 and routing >= 0.70
        weighted = (
            metrics.get("trajectory", 0.0) * 0.25
            + metrics.get("response", 0.0) * 0.2
            + metrics.get("task_completion", 0.0) * 0.25
            + metrics.get("safety", 0.0) * 0.2
            + metrics.get("efficiency", 0.0) * 0.1
        )

        impact_points = round(weighted * 10, 2)
        return {
            "composite": round(weighted, 4),
            "impact_points": impact_points,
            "constraints_ok": constraints_ok,
        }
