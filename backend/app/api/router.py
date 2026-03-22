"""Main API router aggregator."""

from fastapi import APIRouter

from app.api import agents, deploy, evals, experiments, library, sessions, trees

api_router = APIRouter()
api_router.include_router(trees.router)
api_router.include_router(agents.router)
api_router.include_router(library.router)
api_router.include_router(evals.router)
api_router.include_router(sessions.router)
api_router.include_router(experiments.router)
api_router.include_router(deploy.router)
