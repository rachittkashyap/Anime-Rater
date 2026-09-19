// First-party, cookie-less visitor analytics.
//
//  - visitor id : random id kept in localStorage  -> "unique visitors"
//  - session id : random id kept in sessionStorage, renewed after 30 min of inactivity
//  - page view  : sent on every route change
//  - heartbeat  : active (tab visible) seconds, sent every 15 s and when the tab is hidden/closed
//                 -> "time on site"
//
// Nothing personal is collected (no IP, no cookies). The /admin pages are never tracked, and
// visitors with "Do Not Track" turned on are skipped.

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const ENDPOINT = `${API_BASE}/api/hit`;

const VISITOR_KEY = 'animehai_vid';
const SESSION_KEY = 'animehai_sid';
const LAST_ACTIVE_KEY = 'animehai_last_active';
const OPT_OUT_KEY = 'animehai_no_track';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const HEARTBEAT_MS = 15 * 1000;

// ---------- safe storage helpers (private mode / blocked storage must never break the site) ----------
const store = (kind) => {
  try {
    return window[kind];
  } catch {
    return null;
  }
};
const read = (s, key) => {
  try {
    return s?.getItem(key) ?? null;
  } catch {
    return null;
  }
};
const write = (s, key, value) => {
  try {
    s?.setItem(key, value);
  } catch {
    /* ignore */
  }
};

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;

// ---------- opt-out (used by the "don't count my visits" switch on /admin) ----------
export function isTrackingOptedOut() {
  return read(store('localStorage'), OPT_OUT_KEY) === '1';
}

export function setTrackingOptOut(value) {
  const ls = store('localStorage');
  try {
    if (value) ls?.setItem(OPT_OUT_KEY, '1');
    else ls?.removeItem(OPT_OUT_KEY);
  } catch {
    /* ignore */
  }
}

function trackingDisabled() {
  if (typeof window === 'undefined') return true;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return true;
  return isTrackingOptedOut();
}

// ---------- ids ----------
let memoryVisitorId = null;
function getVisitorId() {
  const ls = store('localStorage');
  let id = read(ls, VISITOR_KEY) || memoryVisitorId;
  if (!id) {
    id = uid();
    write(ls, VISITOR_KEY, id);
  }
  memoryVisitorId = id;
  return id;
}

const session = { sid: null, last: 0 };

// Returns the current session id, starting a new session after long inactivity.
function touchSession() {
  const ss = store('sessionStorage');
  const now = Date.now();
  if (!session.sid) {
    session.sid = read(ss, SESSION_KEY);
    session.last = Number(read(ss, LAST_ACTIVE_KEY)) || 0;
  }
  let fresh = false;
  if (!session.sid || now - session.last > SESSION_TIMEOUT_MS) {
    session.sid = uid();
    fresh = true;
    write(ss, SESSION_KEY, session.sid);
  }
  session.last = now;
  write(ss, LAST_ACTIVE_KEY, String(now));
  return { sid: session.sid, fresh };
}

// ---------- transport ----------
function send(payload) {
  const body = JSON.stringify(payload);
  try {
    // text/plain keeps this a "simple" request, so cross-origin beacons need no CORS preflight
    const blob = new Blob([body], { type: 'text/plain;charset=UTF-8' });
    if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, blob)) return;
  } catch {
    /* fall through to fetch */
  }
  try {
    fetch(ENDPOINT, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

// ---------- page views ----------
let currentPath = null;
let firstPageview = true;
let lastPageview = { path: null, at: 0 };

export function trackPageview(pathname) {
  if (pathname.startsWith('/admin')) {
    currentPath = null; // stop counting active time while the owner is on the admin pages
    return;
  }
  if (trackingDisabled()) return;

  const now = Date.now();
  // React StrictMode runs effects twice in dev – don't count the same view twice.
  if (lastPageview.path === pathname && now - lastPageview.at < 1000) return;
  lastPageview = { path: pathname, at: now };
  currentPath = pathname;

  const { sid } = touchSession();
  const payload = {
    type: 'pageview',
    sid,
    vid: getVisitorId(),
    path: pathname,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  };

  // Where the visitor came from only matters for the first page of a visit.
  if (firstPageview) {
    payload.ref = document.referrer || '';
    const params = new URLSearchParams(window.location.search);
    payload.utmSource = params.get('utm_source') || '';
    payload.utmMedium = params.get('utm_medium') || '';
    firstPageview = false;
  }
  send(payload);
}

// ---------- time on site ----------
let visibleSince = null;
let started = false;

function flushActiveTime(final) {
  if (visibleSince == null || !currentPath || trackingDisabled()) return;
  const now = Date.now();
  const sec = Math.min(30, Math.round((now - visibleSince) / 1000));
  visibleSince = final ? null : now;
  if (sec < 1) return;

  const { sid, fresh } = touchSession();
  if (fresh) {
    // The tab sat idle long enough for the old session to expire – open a new one.
    send({
      type: 'pageview',
      sid,
      vid: getVisitorId(),
      path: currentPath,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    });
  }
  send({ type: 'heartbeat', sid, sec });
}

export function startAnalytics() {
  if (started || typeof window === 'undefined') return;
  started = true;

  visibleSince = document.visibilityState === 'visible' ? Date.now() : null;

  setInterval(() => flushActiveTime(false), HEARTBEAT_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushActiveTime(true);
    else visibleSince = Date.now();
  });
  window.addEventListener('pagehide', () => flushActiveTime(true));
}
