# AutoAgent v3 — Merge Brief

## What This Is
v3 merges the best of two prior builds:
- **Backend**: From AutoAgent-Codex (GPT-5.3 build) — 9 engine modules with real algorithmic logic, 8 separate API route files, proper schemas, tests, Celery tasks
- **Frontend**: From AutoAgent-v2 (Claude Code RAPH build) — 7 pages, 4 components, 4,568 lines of TypeScript, Playwright-tested, Observatory design system

## Your Job
1. **Plan the integration** — the frontend expects a different API shape than what the Codex backend provides. Map every frontend API call to the Codex backend endpoints and identify gaps.
2. **Fix the API contract** — update the frontend API client (`frontend/src/lib/api.ts`) and backend routes to speak the same language. The frontend mock data (`frontend/src/lib/mockData.ts`) shows what shapes the UI expects.
3. **Wire real data flow** — replace frontend mock data with actual API calls to the backend. The backend seed data should populate the dashboard.
4. **Merge infrastructure** — Docker Compose, Makefile, README should work for the combined stack.
5. **Run the full stack** — `npm install` frontend, `pip install` backend, verify both start and talk to each other.
6. **Playwright test every page** — screenshots to ~/Desktop/AutoAgent-v3-Screenshots/. Fix anything broken.
7. **Polish** — Observatory design system compliance, loading states, error states, responsive behavior.
8. **Tests** — keep and expand the Codex test suite, ensure they pass with the merged code.

## Key Files to Understand

### Backend (from Codex)
- `backend/app/engine/` — 9 engine modules (tree_analyzer, eval_generator, proposer, scoped_eval_runner, pareto_scorer, cross_tree_validator, strategy_generator, research_memory_manager, briefing_generator)
- `backend/app/api/` — 8 route files (trees, agents, library, evals, sessions, experiments, deploy, live)
- `backend/app/schemas/domain.py` — Pydantic schemas
- `backend/app/models/` — SQLAlchemy models (base, enums, entities)
- `backend/app/seed.py` — seed data
- `backend/app/tasks/training.py` — Celery wave execution
- `backend/tests/` — 5 test files

### Frontend (from v2)
- `frontend/src/pages/` — 7 pages (TreeList, TreeDetail, MorningBriefing, TrainingLiveView, ExperimentDetail, ConfigWizard, DeployPage)
- `frontend/src/components/` — AgentTreeVisualizer, HealthScan, RoutingFlow, ConversationReplay
- `frontend/src/lib/api.ts` — API client (currently points at mock data or v2 backend shape)
- `frontend/src/lib/mockData.ts` — mock data showing expected shapes
- `frontend/src/lib/constants.ts` — Observatory design tokens
- `frontend/src/types/index.ts` — TypeScript types

### Architecture Spec
- `ARCHITECTURE.md` — the full 64KB spec. This is the source of truth.

## Quality Bar
- VP/customer demo ready
- Every page renders with real seed data from the backend
- All Codex tests pass
- Frontend builds clean
- Full Playwright screenshot verification
- Observatory design system: Void #050510, DM Mono + Sora, correct agent colors

## What NOT to do
- Don't rewrite the engine modules — they have real logic, just wire them up
- Don't flatten the Codex API structure back to a monolith
- Don't remove tests
- Don't break the Observatory design system
