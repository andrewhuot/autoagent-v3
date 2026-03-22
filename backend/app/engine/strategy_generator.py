"""Generate research strategy markdown from diagnostics and user scope."""

from __future__ import annotations


class StrategyGenerator:
    """Converts diagnostics into a prioritized per-agent strategy."""

    def generate(self, diagnostic: dict, allowed_levels: list[str]) -> str:
        """Return markdown describing optimization directions by priority."""

        opportunities = sorted(
            diagnostic.get("opportunities", []),
            key=lambda item: item.get("impact", 0),
            reverse=True,
        )

        sections = [
            "## Research Plan",
            "",
            f"Allowed levels: {', '.join(allowed_levels) if allowed_levels else 'L1-L3'}",
            "",
        ]

        for opp in opportunities:
            level = opp.get("level", "L1")
            target = opp.get("target_agent", "Unknown")
            title = opp.get("title", "Untitled")
            cause = opp.get("root_cause", "No root cause provided")
            priority = opp.get("priority", "medium").upper()
            sections.extend(
                [
                    f"### {target} [{level} — {priority} PRIORITY]",
                    f"Problem: {title}",
                    f"Root cause: {cause}",
                    "Direction: Improve clarity, routing boundaries, and deterministic process steps.",
                    "Constraint: Preserve safety floor and avoid regressions in unaffected areas.",
                    "",
                ]
            )

        return "\n".join(sections).strip() + "\n"
