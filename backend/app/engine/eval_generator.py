"""Generation helpers for multi-level eval suites."""

from __future__ import annotations


class MultiLevelEvalGenerator:
    """Builds specialist, routing, end-to-end, and cross-tree eval case drafts."""

    def generate(self, tree_profile: dict) -> dict:
        """Produce eval case payloads for all supported levels."""

        root = tree_profile.get("root_agent", {})
        specialists = [
            child
            for child in root.get("sub_agents", [])
            if child.get("type") == "llm_agent"
        ]

        specialist_evals = []
        routing_evals = []
        e2e_evals = []

        for specialist in specialists:
            name = specialist.get("name", "Specialist")
            specialist_evals.append(
                {
                    "eval_id": f"unit_{name.lower()}",
                    "level": "specialist_unit",
                    "category": "competence",
                    "query": f"Directly test {name} with a domain-specific prompt",
                }
            )
            routing_evals.append(
                {
                    "eval_id": f"routing_to_{name.lower()}",
                    "level": "routing",
                    "category": "routing",
                    "query": f"User issue that should route to {name}",
                    "expected_trajectory": [
                        {
                            "agent": root.get("name", "Orchestrator"),
                            "action": "transfer_to",
                            "target": name,
                        }
                    ],
                }
            )
            e2e_evals.append(
                {
                    "eval_id": f"e2e_{name.lower()}",
                    "level": "end_to_end",
                    "category": "integration",
                    "scenario": {
                        "goal": f"Resolve a realistic {name} customer flow",
                        "expected_agent_sequence": [name],
                        "success_criteria": "Issue is handled with correct tool use and response quality",
                    },
                }
            )

        cross_tree_evals = []
        for library_agent_name in tree_profile.get("library_agents", []):
            cross_tree_evals.append(
                {
                    "eval_id": f"cross_tree_{library_agent_name.lower()}",
                    "level": "cross_tree",
                    "category": "shared_agent",
                    "query": f"Validate {library_agent_name} across all consuming trees",
                }
            )

        return {
            "specialist_unit": specialist_evals,
            "routing": routing_evals,
            "end_to_end": e2e_evals,
            "cross_tree": cross_tree_evals,
        }
