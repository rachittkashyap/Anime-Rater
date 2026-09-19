// Talks to the small Node server in /server (see README → "Admin dashboard").

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'animehai_admin_token';

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw Object.assign(new Error('Cannot reach the analytics server. Is it running?'), { status: 0 });
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    throw Object.assign(new Error(data?.error || `Request failed (${res.status})`), { status: res.status });
  }
  return data;
}

export function adminLogin(password) {
  return request('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}

export function fetchStats(range, token) {
  // getTimezoneOffset() lets the server align hourly/daily buckets to the admin's local clock
  const tz = new Date().getTimezoneOffset();
  return request(`/api/admin/stats?range=${encodeURIComponent(range)}&tz=${tz}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ---- token persistence (12h expiry is enforced by the server too) ----
export function loadSavedToken() {
  try {
    const saved = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
    if (saved?.token && saved.expiresAt > Date.now()) return saved.token;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveToken({ token, expiresAt }) {
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expiresAt }));
  } catch {
    /* ignore */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
