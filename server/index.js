import dotenv from 'dotenv';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

import { createStore } from './store.js';
import { createAuth } from './auth.js';
import { computeStats, RANGES } from './stats.js';
import { classifySource, detectLocation, isBot, parseUserAgent } from './classify.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ quiet: true });
const env = process.env;

const PORT = Number(env.PORT) || 3001;
const DATA_FILE = path.resolve(env.DATA_FILE || path.join(__dirname, 'data', 'analytics.json'));
const SITE_HOSTS = (env.SITE_HOSTS || 'animehai.in,localhost')
  .split(',')
  .map((h) => h.trim().toLowerCase().replace(/^www\./, ''))
  .filter(Boolean);
const CORS_ORIGINS = (env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

// ---------- Admin password ----------
const PLACEHOLDER_PASSWORD = 'change-me-to-a-long-password'; // the value shipped in .env.example
let adminPassword = env.ADMIN_PASSWORD;
if (!adminPassword || adminPassword === PLACEHOLDER_PASSWORD) {
  adminPassword = crypto.randomBytes(9).toString('base64url');
  console.warn('\n[admin] ADMIN_PASSWORD is not set (or still the example value) in .env.');
  console.warn(`[admin] Temporary password for this run: ${adminPassword}\n`);
}

const store = createStore({ file: DATA_FILE, retentionDays: Number(env.RETENTION_DAYS) || 45 });
const auth = createAuth({ password: adminPassword, secret: env.ADMIN_SECRET });

const app = express();
app.disable('x-powered-by');
if (env.TRUST_PROXY) {
  const v = env.TRUST_PROXY;
  app.set('trust proxy', /^\d+$/.test(v) ? Number(v) : v === 'true' ? true : v);
}

// ---------- CORS (only needed when the site is hosted on another domain) ----------
app.use('/api', (req, res, next) => {
  const origin = req.get('origin');
  if (origin && CORS_ORIGINS.includes(origin.replace(/\/$/, ''))) {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    });
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ---------- Tracking endpoint ----------
const ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const eventCounters = new Map(); // sid -> { count, resetAt }  (per-session flood protection)
setInterval(() => {
  const now = Date.now();
  for (const [sid, c] of eventCounters) if (c.resetAt < now) eventCounters.delete(sid);
}, 60_000).unref();

function tooManyEvents(sid) {
  const now = Date.now();
  const c = eventCounters.get(sid);
  if (!c || c.resetAt < now) {
    eventCounters.set(sid, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  c.count += 1;
  return c.count > 90;
}

function cleanPath(input) {
  const p = String(input ?? '').split(/[?#]/)[0].slice(0, 200);
  if (!p.startsWith('/') || p.startsWith('/admin')) return null;
  return p.length > 1 ? p.replace(/\/+$/, '') || '/' : p;
}

// The client posts JSON as text/plain so cross-origin beacons need no CORS preflight.
app.post('/api/hit', express.text({ type: () => true, limit: '4kb' }), (req, res) => {
  res.status(204).end(); // always answer fast; never make the page wait on analytics

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : null;
  } catch {
    return;
  }
  if (!body || typeof body !== 'object' || !ID_RE.test(body.sid ?? '')) return;

  const ua = req.get('user-agent') || '';
  if (isBot(ua) || tooManyEvents(body.sid)) return;

  if (body.type === 'pageview') {
    const pagePath = cleanPath(body.path);
    if (!pagePath || !ID_RE.test(body.vid ?? '')) return;

    const { source, channel } = classifySource({
      ref: body.ref,
      utmSource: body.utmSource,
      utmMedium: body.utmMedium,
      selfHosts: [...SITE_HOSTS, req.hostname],
    });
    const { country, cc } = detectLocation(req.headers, body.tz);
    const { device, browser } = parseUserAgent(ua);

    store.trackPageview({
      sid: body.sid,
      vid: body.vid,
      path: pagePath,
      session: { source, channel, country, cc, tz: String(body.tz ?? '').slice(0, 64), device, browser },
    });
  } else if (body.type === 'heartbeat') {
    const sec = Math.round(Number(body.sec));
    if (!Number.isFinite(sec) || sec < 1) return;
    store.addActiveTime({ sid: body.sid, sec: Math.min(sec, 30) });
  }
});

// ---------- Admin API ----------
app.post('/api/admin/login', express.json({ limit: '1kb' }), (req, res) => {
  res.set('Cache-Control', 'no-store');
  const ip = req.ip;
  if (auth.isLocked(ip)) {
    return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  }
  if (!auth.verifyPassword(req.body?.password)) {
    auth.recordFailure(ip);
    return res.status(401).json({ error: 'Wrong password.' });
  }
  auth.clearFailures(ip);
  res.json(auth.issueToken());
});

function requireAdmin(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!auth.verifyToken(token)) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  res.set('Cache-Control', 'no-store');
  const range = String(req.query.range || '24h');
  if (!RANGES[range]) return res.status(400).json({ error: `range must be one of: ${Object.keys(RANGES).join(', ')}` });

  let tzOffset = Number(req.query.tz);
  if (!Number.isFinite(tzOffset) || Math.abs(tzOffset) > 14 * 60) tzOffset = 0;

  res.json(computeStats(store.snapshot(), { range, tzOffset }));
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// ---------- Serve the built React app (production: `npm run build && npm start`) ----------
const distDir = path.resolve(__dirname, '..', 'dist');
const indexHtml = path.join(distDir, 'index.html');
if (fs.existsSync(indexHtml)) {
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.sendFile(indexHtml);
  });
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({ error: err.status && err.status < 500 ? err.message : 'Server error' });
});

const server = app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[analytics] data file: ${DATA_FILE}`);
});

function shutdown() {
  store.flush();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
