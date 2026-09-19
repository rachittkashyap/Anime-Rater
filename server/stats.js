// Turns the raw sessions/pageviews into the numbers shown on /admin.

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// Each range is `count` whole buckets ending with the current (still filling) one, aligned to the
// admin's local clock: e.g. "7d" = today + the 6 days before it, "24h" = this hour + the 23 before.
// That way every bar is a full period (no tiny partial bar at the start of the chart) and the
// totals are exactly the sum of the bars.
export const RANGES = {
  '1h': { bucket: 5 * MIN, count: 12 },
  '24h': { bucket: HOUR, count: 24 },
  '7d': { bucket: DAY, count: 7 },
  '30d': { bucket: DAY, count: 30 },
};

const LIVE_WINDOW_MS = 60_000; // a visitor counts as "live" if we heard from them in the last minute

// "Time on site" distribution, in seconds: [upper bound (exclusive), label]
const DURATION_BINS = [
  [10, 'Under 10 sec'],
  [30, '10 – 30 sec'],
  [60, '30 sec – 1 min'],
  [180, '1 – 3 min'],
  [600, '3 – 10 min'],
  [Infinity, 'Over 10 min'],
];

function topN(map, n = 10) {
  return [...map.values()].sort((a, b) => b.sessions - a.sessions).slice(0, n);
}

function bump(map, key, base, vid) {
  let row = map.get(key);
  if (!row) {
    row = { ...base, sessions: 0, vids: new Set() };
    map.set(key, row);
  }
  row.sessions += 1;
  row.vids.add(vid);
}

const finish = (rows) => rows.map(({ vids, ...rest }) => ({ ...rest, visitors: vids.size }));

export function computeStats(data, { range, tzOffset = 0, now = Date.now() }) {
  const cfg = RANGES[range];

  // Buckets are aligned to the *viewer's* local clock (tzOffset = Date#getTimezoneOffset()).
  const off = tzOffset * MIN;
  const floorTo = (t) => Math.floor((t - off) / cfg.bucket) * cfg.bucket + off;
  const from = floorTo(now) - (cfg.count - 1) * cfg.bucket;

  const buckets = new Map();
  for (let t = from; t <= now; t += cfg.bucket) {
    buckets.set(t, { t, pageviews: 0, vids: new Set() });
  }

  // ---- Page views (visitors, series, top pages) ----
  const visitorsInRange = new Set();
  const pages = new Map();
  let pageviews = 0;

  for (const pv of data.pageviews) {
    if (pv.t < from || pv.t > now) continue;
    pageviews += 1;
    visitorsInRange.add(pv.vid);

    const bucket = buckets.get(floorTo(pv.t));
    if (bucket) {
      bucket.pageviews += 1;
      bucket.vids.add(pv.vid);
    }

    let page = pages.get(pv.path);
    if (!page) {
      page = { path: pv.path, views: 0, vids: new Set() };
      pages.set(pv.path, page);
    }
    page.views += 1;
    page.vids.add(pv.vid);
  }

  // ---- Sessions (time on site, sources, locations, devices) ----
  const sources = new Map();
  const channels = new Map();
  const countries = new Map();
  const devices = new Map();
  const browsers = new Map();
  const durationBins = DURATION_BINS.map(([, label]) => ({ label, sessions: 0 }));
  const liveVids = new Set();

  let sessions = 0;
  let totalDuration = 0;
  let totalViews = 0;
  let bounces = 0;

  for (const s of Object.values(data.sessions)) {
    if (s.lastSeenAt >= now - LIVE_WINDOW_MS) liveVids.add(s.vid);
    if (s.startedAt < from || s.startedAt > now) continue;

    sessions += 1;
    totalDuration += s.duration;
    totalViews += s.views;
    if (s.views <= 1 && s.duration < 10) bounces += 1;

    bump(sources, `${s.source}|${s.channel}`, { name: s.source, channel: s.channel }, s.vid);
    bump(channels, s.channel, { name: s.channel }, s.vid);
    bump(countries, s.country, { name: s.country, cc: s.cc ?? null }, s.vid);
    bump(devices, s.device, { name: s.device }, s.vid);
    bump(browsers, s.browser, { name: s.browser }, s.vid);

    const binIndex = DURATION_BINS.findIndex(([limit]) => s.duration < limit);
    durationBins[binIndex].sessions += 1;
  }

  const series = [...buckets.values()]
    .sort((a, b) => a.t - b.t)
    .map((b) => ({ t: b.t, pageviews: b.pageviews, visitors: b.vids.size }));

  return {
    range,
    from,
    to: now,
    bucketMs: cfg.bucket,
    live: liveVids.size,
    totals: {
      visitors: visitorsInRange.size,
      sessions,
      pageviews,
      avgSessionSec: sessions ? Math.round(totalDuration / sessions) : 0,
      pagesPerSession: sessions ? Math.round((totalViews / sessions) * 10) / 10 : 0,
      bounceRate: sessions ? Math.round((bounces / sessions) * 1000) / 10 : 0,
    },
    series,
    sources: finish(topN(sources, 10)),
    channels: finish(topN(channels, 10)),
    countries: finish(topN(countries, 10)),
    devices: finish(topN(devices, 5)),
    browsers: finish(topN(browsers, 6)),
    durations: durationBins,
    topPages: [...pages.values()]
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)
      .map(({ vids, ...rest }) => ({ ...rest, visitors: vids.size })),
  };
}
