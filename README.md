# AutoAgent v3 — Observatory

**Multi-agent optimization platform with real-time training visualization.**

AutoAgent discovers, tests, and deploys improvements to AI agent trees — orchestrators, specialists, and shared library agents — across five optimization levels (L1–L5). The Observatory frontend provides a VP/customer-ready dashboard for monitoring training sessions, reviewing experiments, and deploying validated changes.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│  Vite · Tailwind 4 · React Router · Recharts · D3   │
│  Framer Motion · Observatory Design System           │
├─────────────────────────────────────────────────────┤
│                   Backend (FastAPI)                   │
│  SQLAlchemy ORM · Pydantic v2 · Celery · WebSocket  │
│  9 Engine Modules · 8 API Route Files                │
├──────────────┬──────────────┬───────────────────────┤
│  PostgreSQL  │    Redis     │   Celery Worker       │
│  (data)      │  (cache/ws)  │   (training tasks)    │
└──────────────┴──────────────┴───────────────────────┘
```

### Engine Modules

| Module | Purpose |
|--------|---------|
| `tree_analyzer` | Parses agent tree structure, identifies optimization targets |
| `strategy_generator` | Generates training strategy from diagnostic results |
| `proposer` | Proposes experiment hypotheses for each optimization level |
| `scoped_eval_runner` | Runs evaluations scoped to specific agents and levels |
| `pareto_scorer` | Multi-objective scoring with safety/routing floor constraints |
| `cross_tree_validator` | Validates shared agent changes across consuming trees |
| `research_memory_manager` | Persists insights, patterns, and anti-patterns across sessions |
| `briefing_generator` | Builds morning briefing summaries from session results |
| `eval_generator` | Generates evaluation cases for agent capabilities |

### Optimization Levels

| Level | Scope | Example |
|-------|-------|---------|
| L1 | Prompt tuning | Reword instruction to enforce policy check order |
| L2 | Tool/config changes | Add a validation tool to the agent's toolkit |
| L3 | Routing/orchestration | Fix specialist descriptions to reduce misroutes |
| L4 | Architecture changes | Split a monolithic agent into sub-specialists |
| L5 | Cross-tree shared agents | Update a shared library agent used by multiple trees |

---

## Pages

| # | Page | Route | Description |
|---|------|-------|-------------|
| 1 | Morning Briefing | `/` | Session summary — score delta, top experiments, per-agent breakdown |
| 2 | Agent Trees | `/trees` | List of agent trees with scores and status badges |
| 3 | Tree Detail | `/trees/:id` | D3 tree visualization, agent cards, instruction inspector |
| 4 | Health Scan | `/health/:id` | Diagnostic report — routing accuracy, coverage gaps, opportunities |
| 5 | Training Live | `/training/:id` | Real-time session view — waves, experiments, research memory |
| 6 | Experiment Detail | `/experiments/:id` | Hypothesis, config diff, per-dimension scores, cross-tree validation |
| 7 | Configure | `/configure` | 4-step wizard — scope, weights, eval cases, strategy review |
| 8 | Deploy | `/deploy` | Canary deployment config with safety thresholds |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker (for Compose workflow)

### Local Development (recommended)

```bash
# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
# DB auto-creates and seeds on startup (SQLite)

# Frontend (separate terminal)
cd ../frontend
npm install
npm run dev
# Open http://localhost:5173
```

### Docker Compose (full stack)

```bash
make setup
# Starts postgres, redis, backend, celery worker, frontend
# Open http://localhost:5173
```

### Other Commands

```bash
make dev          # Start all services (foreground)
make seed         # Seed demo data if missing (idempotent)
make test         # Run backend pytest suite in backend container
make stop         # Stop all services
make clean        # Stop + remove volumes
make logs         # Tail all service logs
```

### Run Backend Tests Locally

```bash
cd backend
source .venv/bin/activate
python3 -m pytest tests/ -v
```

---

## API Endpoints

### Trees
- `GET /api/trees/` — List agent trees
- `GET /api/trees/{id}` — Single tree
- `GET /api/trees/{id}/agents` — Agents in a tree
- `GET /api/trees/{id}/diagnostics` — Health scan diagnostic report

### Agents
- `GET /api/agents/` — List agents (filter by `tree_id`)
- `GET /api/agents/{id}` — Single agent

### Sessions
- `GET /api/sessions/` — List training sessions
- `POST /api/sessions/` — Create session
- `GET /api/sessions/{id}` — Single session
- `POST /api/sessions/{id}/configure` — Apply wizard config
- `POST /api/sessions/{id}/start` — Start training
- `GET /api/sessions/{id}/briefing` — Morning briefing data
- `GET /api/sessions/{id}/research-memory` — Research memory entries

### Experiments
- `GET /api/experiments/` — List experiments (filter by `session_id`)
- `GET /api/experiments/{id}` — Single experiment

### Deployments
- `POST /api/deploy/` — Create deployment
- `GET /api/deploy/` — List deployments
- `GET /api/deploy/{id}` — Single deployment

### Eval Suites
- `GET /api/evals/suites` — List eval suites
- `GET /api/evals/cases` — List eval cases

### Library
- `GET /api/library/agents` — Shared library agents
- `GET /api/library/consumers` — Library agent consumers

### WebSocket
- `WS /ws/live` — Real-time training updates

---

## Tech Stack

### Backend
- Python 3.11+ / FastAPI / Uvicorn
- SQLAlchemy 2.0 (ORM) / Alembic (migrations)
- Pydantic v2 (schemas)
- Celery + Redis (async training tasks)
- WebSocket (live session updates)
- SQLite (local dev) / PostgreSQL (Docker)

### Frontend
- React 18 / TypeScript / Vite 6
- Tailwind CSS 4.0 (Observatory design system)
- React Router 6 / Recharts / D3.js
- Framer Motion (page transitions)
- Fonts: Sora (headings) + DM Mono (data)

### Design System — Observatory
- Background: Void `#050510`
- Accent: `#6DFFBA` (mint green)
- Agent colors: Orchestrator `#A78BFA`, Specialist `#60A5FA`, Shared `#F472B6`
- Status: Running `#6DFFBA`, Kept `#6DFFBA`, Reverted `#F87171`, Pending `#FBBF24`

---

## Project Structure

```
AutoAgent-v3/
├── backend/
│   ├── app/
│   │   ├── api/          # 8 route files (trees, agents, sessions, experiments, deploy, evals, library)
│   │   ├── engine/       # 9 engine modules (scorer, proposer, validator, etc.)
│   │   ├── models/       # SQLAlchemy entities + enums
│   │   ├── schemas/      # Pydantic domain schemas
│   │   ├── core/         # Config, database, WebSocket manager
│   │   ├── tasks/        # Celery task definitions
│   │   ├── seed.py       # Database seeder (3 trees, 8 agents, 6 experiments)
│   │   └── main.py       # FastAPI app entry point
│   ├── tests/            # pytest suite
│   ├── alembic/          # Database migrations
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/        # 7 page components
│   │   ├── components/   # Shared components (HealthScan, AgentTreeVisualizer, etc.)
│   │   ├── lib/          # API client, mock data, hooks
│   │   └── types/        # TypeScript interfaces
│   └── Dockerfile
├── docker-compose.yml    # Full stack: postgres, redis, backend, celery, frontend
├── Makefile              # Dev commands
├── screenshot.mjs        # Playwright screenshot script (8 pages)
└── PLAN.md               # Integration plan and mismatch analysis
```

---

## Seed Data

The database auto-seeds on startup with:
- **3 agent trees**: Customer Support, Sales Qualification v2, Onboarding Assistant v1
- **8 agents**: 1 orchestrator + 7 specialists (with scores and instructions)
- **1 training session**: Completed, baseline 62% → final 87%
- **6 experiments**: Across 3 waves (5 kept, 1 reverted)
- **2 research memory entries**: Reusable patterns and anti-patterns
- **1 deployment**: Canary at 89% score, threshold 85%

---

## License

Proprietary. Internal use only.
