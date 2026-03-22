"""Cross-tree validation logic for shared library agent updates."""

from __future__ import annotations


class CrossTreeValidator:
    """Evaluates whether shared-agent changes are safe across consumers."""

    def validate(self, baseline_by_tree: dict[str, float], candidate_by_tree: dict[str, float]) -> dict:
        """Validate no consuming tree regresses for a shared-agent update."""

        results: dict[str, dict] = {}
        all_passed = True

        for tree_name, baseline_score in baseline_by_tree.items():
            candidate_score = candidate_by_tree.get(tree_name, baseline_score)
            passed = candidate_score >= baseline_score
            all_passed = all_passed and passed
            results[tree_name] = {
                "passed": passed,
                "baseline": baseline_score,
                "candidate": candidate_score,
                "delta": round(candidate_score - baseline_score, 4),
            }

        return {
            "kept": all_passed,
            "results": results,
            "decision": "KEPT" if all_passed else "REVERTED",
        }
