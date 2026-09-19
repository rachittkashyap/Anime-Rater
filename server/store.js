// Tiny JSON-file "database" for analytics. No external DB.
//
// File shape:
//   {
//     "version": 1,
//     "sessions":  { "<sid>": { vid, startedAt, lastSeenAt, duration, views, landing, source, channel, country, cc, tz, device, browser } },
//     "pageviews": [ { t, sid, vid, path } ]
//   }
//
// Everything lives in memory and is flushed to disk a few seconds after the last change
// (write to a temp file, then rename, so a crash never leaves a half-written file).

import fs from 'node:fs';
import path from 'node:path';

const DAY = 86_400_000;
const MAX_PAGEVIEWS = 300_000; // hard cap so the JSON file can never grow without bound

const emptyData = () => ({ version: 1, sessions: {}, pageviews: [] });

export function createStore({ file, retentionDays = 45, flushDelayMs = 3000 }) {
  fs.mkdirSync(path.dirname(file), { recursive: true });

  let data = load();
  let dirty = false;
  let timer = null;

  function load() {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!parsed || typeof parsed !== 'object') throw new Error('unexpected file shape');
      return {
        version: 1,
        sessions: parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {},
        pageviews: Array.isArray(parsed.pageviews) ? parsed.pageviews : [],
      };
    } catch (err) {
      if (err.code === 'ENOENT') return emptyData();
      // Unreadable / corrupt file: keep it for inspection instead of silently overwriting it.
      const backup = `${file}.corrupt-${Date.now()}`;
      try {
        fs.renameSync(file, backup);
        console.warn(`[analytics] ${file} was unreadable (${err.message}); moved to ${backup}`);
      } catch {
        /* ignore */
      }
      return emptyData();
    }
  }

  function flush() {
    clearTimeout(timer);
    timer = null;
    if (!dirty) return;
    dirty = false;
    const tmp = `${file}.tmp`;
    try {
      fs.writeFileSync(tmp, JSON.stringify(data));
      fs.renameSync(tmp, file);
    } catch (err) {
      dirty = true;
      console.error('[analytics] failed to write data file:', err.message);
    }
  }

  function markDirty() {
    dirty = true;
    if (!timer) {
      timer = setTimeout(flush, flushDelayMs);
      timer.unref?.();
    }
  }

  function prune(now = Date.now()) {
    const cutoff = now - retentionDays * DAY;
    for (const [sid, s] of Object.entries(data.sessions)) {
      if (s.lastSeenAt < cutoff) delete data.sessions[sid];
    }
    const before = data.pageviews.length;
    data.pageviews = data.pageviews.filter((pv) => pv.t >= cutoff);
    if (before !== data.pageviews.length) markDirty();
  }

  prune();
  const pruneTimer = setInterval(() => prune(), 60 * 60 * 1000);
  pruneTimer.unref?.();

  return {
    /** Record a page view; creates the session on first sight of a session id. */
    trackPageview({ sid, vid, path: pagePath, session, now = Date.now() }) {
      let s = data.sessions[sid];
      if (!s) {
        s = { vid, startedAt: now, lastSeenAt: now, duration: 0, views: 0, landing: pagePath, ...session };
        data.sessions[sid] = s;
      } else if (s.vid !== vid) {
        return false; // session id belongs to another visitor id – ignore
      }
      s.views += 1;
      s.lastSeenAt = now;
      data.pageviews.push({ t: now, sid, vid, path: pagePath });
      if (data.pageviews.length > MAX_PAGEVIEWS) {
        data.pageviews.splice(0, Math.floor(MAX_PAGEVIEWS * 0.1));
      }
      markDirty();
      return true;
    },

    /** Add active seconds to an existing session. */
    addActiveTime({ sid, sec, now = Date.now() }) {
      const s = data.sessions[sid];
      if (!s) return false;
      s.duration += sec;
      s.lastSeenAt = now;
      markDirty();
      return true;
    },

    /** Read-only view of the data for stats calculation. */
    snapshot: () => data,

    flush,
    file,
  };
}
