"""Generate level-aware hypothesis branches for experiment waves."""

from __future__ import annotations

from string import ascii_uppercase


class MultiAgentProposer:
    """Creates branch hypotheses from diagnostics and strategy guidance."""

    def propose(self, diagnostic: dict, allowed_levels: list[str], branch_count: int = 3) -> dict:
        """Generate branch proposals with target agent, level, and eval scope."""

        opportunities = [
            item for item in diagnostic.get("opportunities", []) if item.get("level") in allowed_levels
        ]
        if not opportunities:
            opportunities = diagnostic.get("opportunities", [])

        hypotheses = []
        for idx, opp in enumerate(opportunities[:branch_count]):
            level = opp.get("level", "L1")
            target = opp.get("target_agent", "Orchestrator")
            branch_id = ascii_uppercase[idx]

            if level == "L3":
                eval_scope = {"primary": ["routing_*", "e2e_*"], "regression": ["specialist_unit_*"]}
            elif level == "L4":
                eval_scope = {"primary": ["cross_tree_*"], "regression": ["all_consumers_*"]}
            elif level == "L5":
                eval_scope = {"primary": ["all"], "regression": ["cross_tree_if_shared"]}
            else:
                eval_scope = {"primary": [f"unit_{target.lower()}_*", "e2e_*"], "regression": ["routing_*"]}

            hypotheses.append(
                {
                    "branch_id": branch_id,
                    "target_agent": target,
                    "level": level,
                    "title": opp.get("title", f"Improve {target}"),
                    "rationale": opp.get("root_cause", "Derived from diagnostic signals."),
                    "blast_radius": [target],
                    "changes": [
                        {
                            "agent": target,
                            "field": "instruction",
                            "action": "append",
                            "content": "Clarify operating steps, boundaries, and handoff requirements.",
                        }
                    ],
                    "eval_scope": eval_scope,
                }
            )

        return {"hypotheses": hypotheses}
