"""
Corridoor v2 — WebSocket Connection Manager
Manages station and alert WebSocket connections.
Broadcasts: NEW_ALERT (with incident category, floor, reporter info),
            REAL_TIME_UPDATE (with photo URL if present)
"""

import json
from fastapi import WebSocket
from typing import Dict, List


class ConnectionManager:
    """Manages WebSocket connections for fire stations and active alerts."""

    def __init__(self):
        # station_id -> list of connected WebSocket clients
        self.station_connections: Dict[int, List[WebSocket]] = {}
        # alert_id -> list of connected WebSocket clients
        self.alert_connections: Dict[int, List[WebSocket]] = {}

    async def connect_station(self, station_id: int, websocket: WebSocket):
        await websocket.accept()
        if station_id not in self.station_connections:
            self.station_connections[station_id] = []
        self.station_connections[station_id].append(websocket)

    async def connect_alert(self, alert_id: int, websocket: WebSocket):
        await websocket.accept()
        if alert_id not in self.alert_connections:
            self.alert_connections[alert_id] = []
        self.alert_connections[alert_id].append(websocket)

    def disconnect_station(self, station_id: int, websocket: WebSocket):
        if station_id in self.station_connections:
            self.station_connections[station_id] = [
                ws for ws in self.station_connections[station_id] if ws != websocket
            ]

    def disconnect_alert(self, alert_id: int, websocket: WebSocket):
        if alert_id in self.alert_connections:
            self.alert_connections[alert_id] = [
                ws for ws in self.alert_connections[alert_id] if ws != websocket
            ]

    async def broadcast_to_station(self, station_id: int, message: dict):
        """Send message to all clients connected to a station."""
        if station_id not in self.station_connections:
            return
        dead = []
        for ws in self.station_connections[station_id]:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.station_connections[station_id].remove(ws)

    async def broadcast_to_all_stations(self, message: dict):
        """Send message to ALL connected station clients."""
        for station_id in list(self.station_connections.keys()):
            await self.broadcast_to_station(station_id, message)

    async def broadcast_to_alert(self, alert_id: int, message: dict):
        """Send message to all clients following a specific alert."""
        if alert_id not in self.alert_connections:
            return
        dead = []
        for ws in self.alert_connections[alert_id]:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.alert_connections[alert_id].remove(ws)


manager = ConnectionManager()