"""Compose morning briefing payloads from session and experiment data."""

from __future__ import annotations


class BriefingGenerator:
    """Builds a dashboard-friendly morning briefing summary."""

    def build(
        self,
        *,
        session_id: str,
        score_before: float,
        score_after: float,
        experiments: list[dict],
        per_agent_deltas: list[dict],
        routing_before_after: dict,
        shared_agent_validation: list[dict],
    ) -> dict:
        """Create a single payload backing the briefing hero, charts, and cards."""

        delta_pct = 0.0
        if score_before > 0:
            delta_pct = ((score_after - score_before) / score_before) * 100

        top_changes = sorted(experiments, key=lambda exp: exp.get("impact_points", 0), reverse=True)[:5]

        return {
            "session_id": session_id,
            "headline_delta": f"{delta_pct:+.0f}%",
            "score_before": score_before,
            "score_after": score_after,
            "experiment_count": len(experiments),
            "wave_count": max([exp.get("wave_number", 1) for exp in experiments], default=1),
            "per_agent_deltas": per_agent_deltas,
            "routing_before_after": routing_before_after,
            "top_changes": top_changes,
            "shared_agent_validation": shared_agent_validation,
        }
