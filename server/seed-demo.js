// Fills the analytics file with 30 days of realistic FAKE traffic so you can preview /admin.
//   npm run seed:demo            (refuses to touch a file that already has data)
//   npm run seed:demo -- --force (overwrites it)
// Stop the server before running this – it keeps the data in memory and would overwrite the file.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(process.env.DATA_FILE || path.join(__dirname, 'data', 'analytics.json'));

if (fs.existsSync(file) && !process.argv.includes('--force')) {
  try {
    const existing = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (existing.pageviews?.length) {
      console.error(`${file} already contains data. Re-run with --force to overwrite it.`);
      process.exit(1);
    }
  } catch {
    /* unreadable file – fine to overwrite */
  }
}

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const now = Date.now();
const id = () => crypto.randomUUID();
const rand = (n) => Math.floor(Math.random() * n);
const pick = (weighted) => {
  const total = weighted.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [value, w] of weighted) if ((r -= w) <= 0) return value;
  return weighted[0][0];
};

const SOURCES = [
  [{ source: 'Google', channel: 'Search' }, 38],
  [{ source: 'Direct', channel: 'Direct' }, 27],
  [{ source: 'Instagram', channel: 'Social' }, 12],
  [{ source: 'YouTube', channel: 'Social' }, 7],
  [{ source: 'WhatsApp', channel: 'Social' }, 5],
  [{ source: 'Reddit', channel: 'Social' }, 4],
  [{ source: 'Bing', channel: 'Search' }, 3],
  [{ source: 'myanimelist.net', channel: 'Referral' }, 2],
  [{ source: 'Telegram', channel: 'Social' }, 2],
];
const COUNTRIES = [
  [{ country: 'India', cc: 'IN', tz: 'Asia/Kolkata' }, 62],
  [{ country: 'United States', cc: 'US', tz: 'America/New_York' }, 9],
  [{ country: 'Indonesia', cc: 'ID', tz: 'Asia/Jakarta' }, 6],
  [{ country: 'Philippines', cc: 'PH', tz: 'Asia/Manila' }, 5],
  [{ country: 'United Kingdom', cc: 'GB', tz: 'Europe/London' }, 4],
  [{ country: 'Pakistan', cc: 'PK', tz: 'Asia/Karachi' }, 4],
  [{ country: 'Bangladesh', cc: 'BD', tz: 'Asia/Dhaka' }, 3],
  [{ country: 'Brazil', cc: 'BR', tz: 'America/Sao_Paulo' }, 3],
  [{ country: 'Canada', cc: 'CA', tz: 'America/Toronto' }, 2],
  [{ country: 'Germany', cc: 'DE', tz: 'Europe/Berlin' }, 2],
];
const DEVICES = [['Mobile', 72], ['Desktop', 24], ['Tablet', 4]];
const BROWSERS = [['Chrome', 66], ['Safari', 14], ['Samsung Internet', 7], ['Firefox', 5], ['Edge', 5], ['Facebook / Instagram app', 3]];
const PAGES = [
  ['/', 30], ['/trending', 14], ['/season', 10], ['/schedule', 9], ['/upcoming', 5], ['/genres', 4], ['/watchlist', 3],
  ['/anime/21-one-piece', 6], ['/anime/16498-attack-on-titan', 4], ['/anime/38000-demon-slayer', 5],
  ['/anime/40748-jujutsu-kaisen', 5], ['/anime/1535-death-note', 3], ['/genre/action', 3], ['/search', 3],
];

// Fewer visitors overnight (IST), a bump in the evening; slow growth over the month.
const hourWeight = (h) => [2, 1, 1, 1, 1, 2, 3, 4, 5, 5, 5, 6, 6, 6, 6, 7, 8, 9, 10, 11, 11, 9, 6, 4][h];

const sessions = {};
const pageviews = [];

for (let d = 29; d >= 0; d--) {
  const dayStart = new Date(now - d * DAY);
  dayStart.setHours(0, 0, 0, 0);
  const perDay = Math.round((130 + (29 - d) * 5 + rand(60)) * (dayStart.getDay() === 0 || dayStart.getDay() === 6 ? 1.25 : 1));
  for (let i = 0; i < perDay; i++) {
    const hour = pick(Array.from({ length: 24 }, (_, h) => [h, hourWeight(h)]));
    const start = dayStart.getTime() + hour * 60 * MIN + rand(60) * MIN + rand(60_000);
    if (start > now) continue;

    const vid = id();
    const sid = id();
    const src = pick(SOURCES);
    const loc = pick(COUNTRIES);
    const views = pick([[1, 45], [2, 22], [3, 14], [4, 9], [5, 6], [7, 4]]);
    const bounce = views === 1 && Math.random() < 0.6;
    const duration = bounce ? rand(9) : Math.round(views * (15 + Math.random() * 70) * (Math.random() < 0.1 ? 4 : 1));

    sessions[sid] = {
      vid, startedAt: start, lastSeenAt: start + duration * 1000, duration, views,
      landing: '/', ...src, ...loc, device: pick(DEVICES), browser: pick(BROWSERS),
    };
    for (let v = 0; v < views; v++) {
      const path = v === 0 && Math.random() < 0.35 ? '/' : pick(PAGES);
      pageviews.push({ t: start + Math.round((duration * 1000 * v) / views), sid, vid, path });
    }
  }
}
pageviews.sort((a, b) => a.t - b.t);

fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify({ version: 1, sessions, pageviews }));
console.log(`Wrote ${Object.keys(sessions).length} demo sessions / ${pageviews.length} page views to ${file}`);
