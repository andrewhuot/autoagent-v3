"""Eval selection and scoring utilities for scoped experiment execution."""

from __future__ import annotations


class ScopedEvalRunner:
    """Runs a lightweight scoring pass on selected eval levels and cases."""

    def select_scope(self, level: str, target_agent_name: str | None = None) -> dict:
        """Return primary and regression scopes for an optimization level."""

        if level == "L1":
            return {
                "primary": [f"specialist_unit:{target_agent_name or 'target'}", "end_to_end:target_paths"],
                "regression": ["routing:all"],
            }
        if level == "L2":
            return {
                "primary": [f"tool_selection:{target_agent_name or 'target'}"],
                "regression": ["routing:all", "end_to_end:target_paths"],
            }
        if level == "L3":
            return {
                "primary": ["routing:all", "end_to_end:all"],
                "regression": ["specialist_unit:all"],
            }
        if level == "L4":
            return {
                "primary": ["cross_tree:all_consumers"],
                "regression": ["all:consumers"],
            }
        return {"primary": ["full_suite:all"], "regression": ["cross_tree:if_shared"]}

    def run(self, base_score: float, lift: float, level: str) -> dict:
        """Return synthetic score payload used by the demo backend."""

        scope = self.select_scope(level)
        next_score = min(1.0, base_score + lift)
        return {
            "score_before": base_score,
            "score_after": next_score,
            "delta": round(next_score - base_score, 4),
            "scope": scope,
            "passed_regression": next_score >= base_score - 0.01,
        }
