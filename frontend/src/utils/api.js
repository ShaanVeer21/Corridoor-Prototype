/**
 * Corridoor API Client
 * Centralized API calls to the FastAPI backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  // Don't set Content-Type for FormData (file uploads)
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

// ── Buildings ──
export const getBuildings = () => request('/api/buildings');
export const getBuilding = (id) => request(`/api/buildings/${id}`);
export const getNearestStation = (id) => request(`/api/buildings/${id}/station`);

// ── Fire Stations ──
export const getStations = () => request('/api/stations');

// ── Users ──
export const registerUser = (data) =>
  request('/api/users', { method: 'POST', body: JSON.stringify(data) });

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

export const getUpdates = (alertId) => request(`/api/updates/${alertId}`);

// ── NOC ──
export const searchNOC = (params = {}) => {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.hazard_only) query.set('hazard_only', 'true');
  if (params.expired_only) query.set('expired_only', 'true');
  if (params.building_type) query.set('building_type', params.building_type);
  const qs = query.toString();
  return request(`/api/noc/search${qs ? `?${qs}` : ''}`);
};

export const uploadNOC = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return request('/api/noc/upload', { method: 'POST', body: formData });
};

// ── WebSocket ──
export const connectStationWS = (stationId, onMessage) => {
  const wsUrl = API_BASE.replace('http', 'ws');
  const ws = new WebSocket(`${wsUrl}/ws/station/${stationId}`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };

  ws.onerror = (err) => console.error('WebSocket error:', err);
  ws.onclose = () => console.log('WebSocket disconnected');

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

// ── Health ──
export const getHealth = () => request('/api/health');

// ── Static files ──
export const getFloorplanUrl = (path) => {
  if (!path) return null;
  // Strip leading path if present
  const filename = path.replace('noc_data/', '');
  return `${API_BASE}/static/${filename}`;
};
