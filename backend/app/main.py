"""FastAPI app entrypoint for the AutoAgent platform."""

from __future__ import annotations

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.database import SessionLocal, init_db
from app.core.live import live_manager
from app.seed import seed_database

settings = get_settings()

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_prefix)


@app.on_event("startup")
def startup_event() -> None:
    """Initialize database schema for local execution."""

    init_db()
    with SessionLocal() as db:
        seed_database(db)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness endpoint used by Docker and tests."""

    return {"status": "ok"}


@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket) -> None:
    """Broadcast live training and experiment updates to dashboard clients."""

    await live_manager.connect(websocket)
    try:
        while True:
            message = await websocket.receive_text()
            await live_manager.broadcast({"type": "echo", "message": message})
    except WebSocketDisconnect:
        live_manager.disconnect(websocket)
