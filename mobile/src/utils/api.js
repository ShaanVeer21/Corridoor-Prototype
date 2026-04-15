/**
 * Corridoor Mobile API Client
 * Connects to the FastAPI backend.
 * 
 * IMPORTANT: Change API_BASE to your computer's local IP when testing
 * on a physical phone. "localhost" won't work from your phone.
 * Find your IP: run `ipconfig` on Windows, use the IPv4 address.
 * Example: 'http://192.168.1.42:8000'
 */

// For Expo Go on physical device, use your computer's local network IP
// For emulator, use 'http://10.0.2.2:8000' (Android) or 'http://localhost:8000' (iOS)
const API_BASE = 'http://172.20.10.2:8000'; // ← CHANGE THIS to your IP

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ── Buildings ──
export const getBuildings = () => request('/api/buildings');
export const getNearestStation = (id) => request(`/api/buildings/${id}/station`);

// ── Users ──
export const registerUser = (data) =>
  request('/api/users', { method: 'POST', body: JSON.stringify(data) });

// ── Alerts ──
export const createAlert = (data) =>
  request('/api/alerts', { method: 'POST', body: JSON.stringify(data) });

export const getAlerts = (params = {}) => {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return request(`/api/alerts${qs ? `?${qs}` : ''}`);
};

// ── Real-time Updates ──
export const sendUpdate = (data) =>
  request('/api/updates', { method: 'POST', body: JSON.stringify(data) });

// ── Health ──
export const getHealth = () => request('/api/health');