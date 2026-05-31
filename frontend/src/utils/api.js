/**
 * Corridoor v2 — Frontend API Client
 * Updated for new backend: NOC upload, floorplan upload, 
 * floor-specific plans, photo uploads, responder login.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// Encode building IDs that contain slashes (e.g., P-29345/2026)
function encodeBuildingId(id) {
  return encodeURIComponent(id);
}

// ── Buildings ──
export const getBuildings = () => request('/api/buildings');
export const getBuilding = (id) => request(`/api/buildings/${encodeBuildingId(id)}`);
export const getNearestStation = (id) => request(`/api/buildings/${encodeBuildingId(id)}/station`);

// ── Floor Plans ──
export const getFloorplans = (buildingId) => request(`/api/buildings/${encodeBuildingId(buildingId)}/floorplans`);
export const getFloorplanForFloor = (buildingId, floorNumber) =>
  request(`/api/buildings/${encodeBuildingId(buildingId)}/floorplans/floor/${floorNumber}`);

// ── Fire Stations ──
export const getStations = () => request('/api/stations');

// ── Users ──
export const registerUser = (data) =>
  request('/api/users', { method: 'POST', body: JSON.stringify(data) });

export const responderLogin = (data) =>
  request('/api/responder/login', { method: 'POST', body: JSON.stringify(data) });

// ── Alerts ──
export const createAlert = (data) =>
  request('/api/alerts', { method: 'POST', body: JSON.stringify(data) });

export const getAlerts = (params = {}) => {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.station_id) query.set('station_id', params.station_id);
  const qs = query.toString();
  return request(`/api/alerts${qs ? `?${qs}` : ''}`);
};

export const updateAlertStatus = (alertId, status) =>
  request(`/api/alerts/${alertId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

// ── Real-time Updates ──
export const sendUpdate = (data) =>
  request('/api/updates', { method: 'POST', body: JSON.stringify(data) });

export const sendUpdateWithPhoto = async (formData) => {
  const url = `${API_BASE}/api/updates/with-photo`;
  const response = await fetch(url, {
    method: 'POST',
    body: formData, // FormData — no Content-Type header
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
};

export const getUpdates = (alertId) => request(`/api/updates/${alertId}`);

// ── NOC Upload ──
export const uploadNOC = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return request('/api/noc/upload', { method: 'POST', body: formData });
};

export const uploadFloorplan = async (buildingId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return request(`/api/noc/upload/${encodeBuildingId(buildingId)}/floorplan`, {
    method: 'POST',
    body: formData,
  });
};

// ── NOC Search ──
export const searchNOC = (params = {}) => {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.hazard_only) query.set('hazard_only', 'true');
  if (params.expired_only) query.set('expired_only', 'true');
  if (params.ward) query.set('ward', params.ward);
  const qs = query.toString();
  return request(`/api/noc/search${qs ? `?${qs}` : ''}`);
};

// ── Health ──
export const getHealth = () => request('/api/health');

// ── WebSocket ──
export const connectStationWS = (stationId, onMessage) => {
  const wsUrl = API_BASE.replace('http', 'ws');
  const ws = new WebSocket(`${wsUrl}/ws/station/${stationId}`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };

  ws.onerror = (err) => console.error('WebSocket error:', err);
  ws.onclose = () => console.log(`Station ${stationId} WebSocket disconnected`);

  return ws;
};

export const connectAlertWS = (alertId, onMessage) => {
  const wsUrl = API_BASE.replace('http', 'ws');
  const ws = new WebSocket(`${wsUrl}/ws/alert/${alertId}`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };

  return ws;
};

// ── Static file URLs ──
export const getFloorplanUrl = (path) => {
  if (!path) return null;
  return `${API_BASE}/static/${path}`;
};

export const getPhotoUrl = (photoUrl) => {
  if (!photoUrl) return null;
  // photoUrl from API is like "/static/photos/filename.jpg"
  if (photoUrl.startsWith('/')) {
    return `${API_BASE}${photoUrl}`;
  }
  return `${API_BASE}/static/${photoUrl}`;
};

// NOC PDF viewer
export const getNocPdfUrl = (buildingId) => {
  return `${API_BASE}/api/noc/pdf/${encodeURIComponent(buildingId)}`;
};

