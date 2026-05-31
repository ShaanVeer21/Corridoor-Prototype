/**
 * Corridoor v2 — Mobile API Client
 * Updated for incident categories, floor selection, photo uploads.
 */

const API_BASE = 'http://172.20.10.2:8000'; // ← CHANGE to your IP

function encodeBuildingId(id) {
  return encodeURIComponent(id);
}

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

// Buildings
export const getBuildings = () => request('/api/buildings');
export const getBuilding = (id) => request(`/api/buildings/${encodeBuildingId(id)}`);
export const getNearestStation = (id) => request(`/api/buildings/${encodeBuildingId(id)}/station`);

// Users
export const registerUser = (data) =>
  request('/api/users', { method: 'POST', body: JSON.stringify(data) });

// Alerts — now with incident_category, floor, floor_number
export const createAlert = (data) =>
  request('/api/alerts', { method: 'POST', body: JSON.stringify(data) });

// Updates — text only
export const sendUpdate = (data) =>
  request('/api/updates', { method: 'POST', body: JSON.stringify(data) });

// Updates — with photo
export const sendUpdateWithPhoto = async (formData) => {
  const url = `${API_BASE}/api/updates/with-photo`;
  const response = await fetch(url, { method: 'POST', body: formData });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
};

// Health
export const getHealth = () => request('/api/health');

// Photo URL
export const getPhotoUrl = (photoUrl) => {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('/')) return `${API_BASE}${photoUrl}`;
  return `${API_BASE}/static/${photoUrl}`;
};

// Stations
export const getStations = () => request('/api/stations');

// Alerts list
export const getAlerts = (params = {}) => {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return request(`/api/alerts${qs ? `?${qs}` : ''}`);
};

// Responder login
export const responderLogin = (data) =>
  request('/api/responder/login', { method: 'POST', body: JSON.stringify(data) });

// Updates for an alert
export const getUpdates = (alertId) => request(`/api/updates/${alertId}`);

// Floorplan image URL
export const getFloorplanUrl = (path) => {
  if (!path) return null;
  return `${API_BASE}/static/${path}`;
};

// WebSocket — station alerts
export const connectStationWS = (stationId, onMessage) => {
  const wsUrl = API_BASE.replace('http', 'ws');
  const ws = new WebSocket(`${wsUrl}/ws/station/${stationId}`);
  ws.onmessage = (event) => onMessage(JSON.parse(event.data));
  ws.onerror = (err) => console.error('WS error:', err);
  return ws;
};

// WebSocket — alert updates
export const connectAlertWS = (alertId, onMessage) => {
  const wsUrl = API_BASE.replace('http', 'ws');
  const ws = new WebSocket(`${wsUrl}/ws/alert/${alertId}`);
  ws.onmessage = (event) => onMessage(JSON.parse(event.data));
  return ws;
};