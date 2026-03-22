"""Agent tree parsing and profile generation utilities."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass


@dataclass
class TreeAnalysisResult:
    """Structured output from the tree analyzer."""

    profile: dict


class TreeAnalyzer:
    """Parses a root agent payload into an AgentTreeProfile structure."""

    def analyze(self, root_agent: dict) -> TreeAnalysisResult:
        """Generate a profile describing hierarchy, routing paths, and library reuse."""

        nodes = []
        routing_paths = []
        library_agents: set[str] = set()
        tools_total = 0
        max_depth = 0

        queue: deque[tuple[dict, int, list[str]]] = deque([(root_agent, 1, ["root"])])
        while queue:
            node, depth, path = queue.popleft()
            max_depth = max(max_depth, depth)
            nodes.append(node)

            if node.get("is_library_agent"):
                library_agents.add(node.get("name", "unknown"))

            tools_total += len(node.get("tools", []))

            child_agents = node.get("sub_agents", [])
            if child_agents:
                for child in child_agents:
                    child_name = child.get("name", "unknown")
                    next_path = path + [child_name]
                    routing_paths.append(" -> ".join(next_path))
                    queue.append((child, depth + 1, next_path))

        profile = {
            "root_agent": root_agent,
            "total_agents": len(nodes),
            "tree_depth": max_depth,
            "library_agents": sorted(library_agents),
            "tools_total": tools_total,
            "routing_paths": routing_paths,
        }
        return TreeAnalysisResult(profile=profile)
