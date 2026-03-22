"""Utilities for creating transfer-ready research memory entries."""

from __future__ import annotations


class ResearchMemoryManager:
    """Builds normalized research memory payloads from experiment output."""

    def build_entry(
        self,
        *,
        experiment_id: str,
        target_agent: str,
        level: str,
        hypothesis: str,
        outcome: str,
        insight: str,
        transferable_to: list[str],
    ) -> dict:
        """Create a structured memory entry for persistence and proposer reuse."""

        return {
            "experiment_id": experiment_id,
            "target_agent": target_agent,
            "level": level,
            "hypothesis": hypothesis,
            "outcome": outcome,
            "insight": insight,
            "reusable_pattern": "Encode explicit domain boundaries and ordered steps.",
            "transferable_to": transferable_to,
        }
