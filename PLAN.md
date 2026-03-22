# AutoAgent v3 — Integration Plan

## Mismatch Analysis

### API Path Mismatches (Frontend expects → Backend provides)

| # | Frontend Call | Backend Endpoint | Fix |
|---|---|---|---|
| 1 | `GET /api/trees/{id}/agents` | `GET /api/agents/?tree_id=X` | Add backend route OR update frontend |
| 2 | `GET /api/library` | `GET /api/library/agents` | Update frontend path |
| 3 | `GET /api/library/{id}/consumers` | `GET /api/library/consumers` (no filter) | Add query param to backend |
| 4 | `GET /api/trees/{treeId}/evals` | `GET /api/evals/suites?tree_id=X` | Update frontend path |
| 5 | `GET /api/evals/{suiteId}/cases` | `GET /api/evals/cases?suite_id=X` | Update frontend path |
| 6 | `GET /api/sessions/{id}` (single) | Only list endpoint exists | Add backend route |
| 7 | `GET /api/sessions/{sid}/experiments` | `GET /api/experiments/?session_id=X` | Update frontend path |
| 8 | `GET /api/experiments/{id}` (single) | Only list endpoint exists | Add backend route |
| 9 | `POST /api/deployments` | `POST /api/deploy/` | Update frontend path + schema |
| 10 | `GET /api/deployments/{id}` | `GET /api/deploy/?session_id=X` | Update frontend path |
| 11 | `GET /api/trees/{id}/diagnostics` | `GET /api/trees/{id}/health-scan` | Update frontend path |
| 12 | `WS /ws` | `WS /ws/live` | Update frontend path |

### Schema Mismatches (Frontend type → Backend schema)

#### Agent
| Frontend field | Backend field | Resolution |
|---|---|---|
| `system_prompt` | `instruction` | Rename frontend to `instruction` |
| `score`, `score_before` | not present | Add to backend model + seed |
| `is_shared` | `role == "shared"` | Compute in frontend from `role` |
| `tools: string[]` | `tools: list[dict]` | Map `tool.name` in frontend |

#### AgentTree
| Frontend field | Backend field | Resolution |
|---|---|---|
| `description` | not present | Add to backend model |
| `owner` | not present | Add to backend model |
| `agents: Agent[]` | not embedded | Add to backend response (join) |
| `score`, `score_before` | not present | Add to backend model |
| `status` | not present | Add to backend model |
| `agent_count` | not present | Compute from agents |

#### TrainingSession
| Frontend field | Backend field | Resolution |
|---|---|---|
| `tree_name` | not present | Join or denormalize |
| `current_wave` | not present | Compute from experiments |
| `total_waves` | not present | Add to backend |
| `waves: WaveData[]` | not present | Build from experiments |
| `score_start` | `baseline_scores.overall` | Map in frontend |
| `score_current` | `final_scores.overall` | Map in frontend |
| `scope` | `allowed_levels` | Rename in frontend |
| `research_memory` | separate table | Join in backend response |

#### Experiment
| Frontend field | Backend field | Resolution |
|---|---|---|
| `tree_id` | not present | Join via session |
| `wave` | `wave_number` | Rename in frontend |
| `target_agent_name` | not present | Join or denormalize |
| `hypothesis` | `hypothesis_title` | Rename in frontend |
| `score_before`, `score_after` | in `scores` dict | Extract in frontend |
| `per_dimension_scores` | in `scores` dict | Extract in frontend |
| `cross_tree_results: CrossTreeResult[]` | `cross_tree_results: dict` | Reshape in frontend |

#### Deployment
| Frontend field | Backend field | Resolution |
|---|---|---|
| `canary_percent` | `canary_percentage` | Rename in frontend |
| `canary_score` | not present | Add to backend |
| `target_score` | not present | Add to backend |
| `approved_by` | not present | Add to backend |

---

## Integration Strategy

**Principle**: Update BOTH sides to meet in the middle. Add missing fields to backend where the data model genuinely needs them. Update frontend types/API calls where it's just a naming difference.

### Step 1: Backend Schema + Model Updates

1. **`entities.py`** — Add missing columns:
   - `agent_trees`: `description`, `owner`, `score`, `score_before`, `status`
   - `agents`: `score`, `score_before`
   - `deployments`: `canary_score`, `target_score`, `approved_by`
   - `training_sessions`: `total_waves`

2. **`domain.py`** — Update Pydantic schemas to include new fields

3. **`seed.py`** — Update seed data with scores, descriptions, owners, statuses

### Step 2: Backend Route Updates

1. **`trees.py`** — Add `GET /trees/{tree_id}/agents` convenience route; embed agents in tree response
2. **`sessions.py`** — Add `GET /sessions/{session_id}` single-session route
3. **`experiments.py`** — Add `GET /experiments/{experiment_id}` single-experiment route
4. **`library.py`** — Add `library_agent_id` query filter to consumers endpoint

### Step 3: Frontend Type Updates

1. **`types/index.ts`** — Align field names with backend (instruction, wave_number, etc.)
2. **`lib/api.ts`** — Update all endpoint paths to match backend routes
3. **`lib/mockData.ts`** — Update mock data to match new type shapes

### Step 4: Frontend Component Updates

1. All pages that reference `system_prompt` → `instruction`
2. All pages that reference `hypothesis` → `hypothesis_title`
3. All pages that use `wave` → `wave_number`
4. Transform functions for: scores dict → individual fields, tools dict → names

### Step 5: Infrastructure

1. **Vite proxy** — Change target from `http://backend:8000` to `http://localhost:8000` for local dev
2. **Makefile** — Fix seed command path (`app.seed` not `app.seeds.seed_data`)
3. **Docker Compose** — Verify celery command path
4. **Backend Dockerfile** — Verify it installs all deps

### Step 6: Data Flow Verification

For each page, verify the chain: Page → useApi hook → api.ts fetch → backend route → DB → response → render

| Page | Primary API Calls |
|---|---|
| MorningBriefing | `GET /api/sessions/{id}/briefing` |
| TreeList | `GET /api/trees/` |
| TreeDetail | `GET /api/trees/{id}`, `GET /api/agents/?tree_id=X` |
| HealthScan | `GET /api/trees/{id}/health-scan` |
| TrainingLiveView | `GET /api/sessions/{id}`, `GET /api/experiments/?session_id=X` |
| ExperimentDetail | `GET /api/experiments/{id}` |
| ConfigWizard | local state (minimal API) |
| DeployPage | `POST /api/deploy/`, `GET /api/deploy/` |

---

## Execution Order

1. Backend model + schema updates (add missing fields)
2. Backend route additions (single-item GETs)
3. Backend seed data update (populate all fields)
4. Frontend types alignment
5. Frontend api.ts rewrite
6. Frontend page-by-page fixes
7. npm install + pip install
8. Start both servers
9. Playwright test loop
10. Harden (loading/error states, build clean)
