"""
WebSocket connection manager.
Handles broadcasting real-time updates from staff to fire station dashboards.
"""

from fastapi import WebSocket
from typing import Dict, List
import json


class ConnectionManager:
    """
    Manages WebSocket connections grouped by fire station.
    When a building sends an update, it broadcasts to all
    dashboard clients connected to that building's fire station.
    """

    def __init__(self):
        # station_id → list of active WebSocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Also support per-alert subscriptions
        self.alert_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, station_id: int):
        """Accept a new dashboard connection for a fire station."""
        await websocket.accept()
        if station_id not in self.active_connections:
            self.active_connections[station_id] = []
        self.active_connections[station_id].append(websocket)

    async def connect_alert(self, websocket: WebSocket, alert_id: int):
        """Accept a connection subscribed to a specific alert's updates."""
        await websocket.accept()
        if alert_id not in self.alert_connections:
            self.alert_connections[alert_id] = []
        self.alert_connections[alert_id].append(websocket)

    def disconnect(self, websocket: WebSocket, station_id: int):
        """Remove a disconnected dashboard client."""
        if station_id in self.active_connections:
            self.active_connections[station_id] = [
                ws for ws in self.active_connections[station_id] if ws != websocket
            ]

    def disconnect_alert(self, websocket: WebSocket, alert_id: int):
        """Remove a disconnected alert subscriber."""
        if alert_id in self.alert_connections:
            self.alert_connections[alert_id] = [
                ws for ws in self.alert_connections[alert_id] if ws != websocket
            ]

    async def broadcast_to_station(self, station_id: int, message: dict):
        """Send a message to all dashboards watching this fire station."""
        if station_id in self.active_connections:
            dead = []
            for ws in self.active_connections[station_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            # Cleanup dead connections
            for ws in dead:
                self.disconnect(ws, station_id)

    async def broadcast_to_alert(self, alert_id: int, message: dict):
        """Send a message to all clients watching a specific alert."""
        if alert_id in self.alert_connections:
            dead = []
            for ws in self.alert_connections[alert_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.disconnect_alert(ws, alert_id)

    async def broadcast_new_alert(self, station_id: int, alert_data: dict):
        """Special broadcast for new incoming alerts — high priority."""
        message = {
            "type": "NEW_ALERT",
            "data": alert_data,
        }
        await self.broadcast_to_station(station_id, message)

    async def broadcast_update(self, station_id: int, alert_id: int, update_data: dict):
        """Broadcast a real-time update to both station and alert subscribers."""
        message = {
            "type": "REAL_TIME_UPDATE",
            "data": update_data,
        }
        await self.broadcast_to_station(station_id, message)
        await self.broadcast_to_alert(alert_id, message)


# Global singleton
manager = ConnectionManager()