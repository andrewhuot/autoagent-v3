"""WebSocket connection manager for live training updates."""

from __future__ import annotations

from fastapi import WebSocket


class LiveConnectionManager:
    """Manages active websocket clients and broadcast events."""

    def __init__(self) -> None:
        self.connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """Accept and register a websocket connection."""

        await websocket.accept()
        self.connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a websocket connection from the active set."""

        if websocket in self.connections:
            self.connections.remove(websocket)

    async def broadcast(self, payload: dict) -> None:
        """Send an event payload to all connected clients."""

        for connection in list(self.connections):
            await connection.send_json(payload)


live_manager = LiveConnectionManager()
