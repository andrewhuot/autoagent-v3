"""Background jobs for training session orchestration."""

from __future__ import annotations

from datetime import datetime

from app.tasks.celery_app import celery_app


@celery_app.task(name="autoagent.run_experiment_wave")
def run_experiment_wave(session_id: str, wave_number: int, hypotheses: list[dict]) -> dict:
    """Execute a synthetic experiment wave and return summary metrics."""

    branch_results = []
    for index, hypothesis in enumerate(hypotheses):
        branch_results.append(
            {
                "branch_id": hypothesis.get("branch_id", chr(65 + index)),
                "target_agent": hypothesis.get("target_agent"),
                "level": hypothesis.get("level"),
                "status": "kept" if index % 3 != 2 else "reverted",
                "impact_points": round(5.5 + (index * 1.2), 2),
            }
        )

    return {
        "session_id": session_id,
        "wave_number": wave_number,
        "started_at": datetime.utcnow().isoformat(),
        "completed_at": datetime.utcnow().isoformat(),
        "branch_results": branch_results,
    }
