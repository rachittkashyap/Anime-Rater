# AnimeHai.in

Automated anime discovery & tracking platform. React + Vite, no database, no AI API.
All anime data comes from free public APIs and is fetched live/cached in the browser.
The only server-side piece is a tiny Node server (`server/`) that stores visitor
analytics in a JSON file for the `/admin` dashboard (see "Admin dashboard" below).

## Dual-API architecture (with automatic fallback)

- **Primary: Jikan API** (`src/api/jikan.js`) — wraps the public MyAnimeList data via
  `https://api.jikan.moe/v4`. Handles timeouts, 429 rate-limit backoff, and retries.
- **Secondary: AniList GraphQL API** (`src/api/anilist.js`) — wraps
  `https://graphql.anilist.co`.
- **`src/api/animeService.js`** is the only module the UI talks to. Every function
  (`getTrendingAnime`, `getCurrentSeasonAnime`, `searchAnime`, `getAnimeDetails`, etc.)
  tries Jikan first; if that call throws for **any** reason (timeout, rate limit, 5xx,
  network error), it automatically retries the same request against AniList and
  normalizes the result into one common shape (`{ id, title, image, rating, genres, ... }`)
  so components never need to know which API actually answered.
- Every call is wrapped in `cachedFetch` (`src/utils/cache.js`), which de-dupes
  concurrent identical requests and caches responses in `localStorage` with
  feature-appropriate TTLs (trending 45 min, season 3 hr, details 12 hr, schedule 30 min).

If **both** APIs fail, the UI shows "Anime data is temporarily unavailable. Please try
again." instead of crashing.

## No database, no login

The watchlist lives entirely in the browser via `localStorage`
(`src/utils/storage.js`, key `animehai_watchlist`). No user accounts, no server-side
storage of any personal data.

## Getting started

```bash
npm install
cp .env.example .env    # then set ADMIN_PASSWORD (needed for /admin)
npm run dev             # website (:5173) + analytics server (:3001) together
npm run dev:web         # website only (no analytics / no /admin)
npm run build           # production build to /dist
npm start               # analytics server + serves the built site from /dist
```

## Admin dashboard (`/admin`)

Open `/admin`, enter `ADMIN_PASSWORD` (from `.env`) and you get website metrics for the
**last hour, 24 hours, 7 days and 30 days**:

- **Visitors, visits (sessions), page views, live now**
- **Time on site** — average per visit + a "how long visitors stay" breakdown
- **Where visitors come from** — traffic source (Google, Instagram, Direct, other sites,
  `?utm_source=` links) and **country**
- Traffic-over-time chart, top pages, devices, browsers

How it works — no database, no cookies, no IP addresses stored:

- `src/utils/analytics.js` (mounted through `AnalyticsTracker`) sends a page view on every
  route change and "active seconds" heartbeats while the tab is visible.
- `server/index.js` receives them at `POST /api/hit` and keeps everything in
  `server/data/analytics.json` (git-ignored; written atomically a few seconds after each
  change; history older than 45 days is pruned automatically).
- `GET /api/admin/stats` is password-protected (signed 12-hour token, login attempts are
  rate-limited). Bots/crawlers, `/admin` itself and visitors with "Do Not Track" are not counted.
- On `/admin` use **"Don't count my visits"** so your own browsing doesn't inflate the numbers.
- Country comes from the host's IP-geo header when available (Cloudflare, Vercel, CloudFront);
  otherwise it's derived from the visitor's browser timezone.
- Ranges are whole buckets ending now, on the admin's local clock: "7 days" = today + the
  6 days before, "24 hours" = the current hour + the 23 before.

Preview the dashboard with fake data: stop the server, run `npm run seed:demo`, start again.

**Hosting note:** the JSON file needs a server with a *persistent disk*. Netlify/Vercel
serve only static files (their serverless filesystem is wiped), so run the Node server
(`npm run build && npm start`) on something like Render (with a disk), Railway (volume),
Fly.io, or a VPS. If the website stays on Netlify, deploy the server separately and set
`VITE_API_BASE_URL` (frontend) and `CORS_ORIGIN` (server) — see `.env.example`. Behind a
proxy/load balancer also set `TRUST_PROXY=1`.

## Deploying to Vercel

1. Push this project to a GitHub repository.
2. Import the repo in Vercel — it auto-detects Vite (`npm run build`, output `dist`).
3. No environment variables are required (both APIs are keyless), but you can override
   `VITE_JIKAN_BASE_URL` / `VITE_ANILIST_URL` in Vercel's project settings if needed.
4. Deploy — the site is fully static + client-side, so no server function or database
   setup is required.

## Deploying to Netlify

1. Push this project to a GitHub repository.
2. In Netlify: "Add new site" → "Import an existing project" → pick the repo.
3. Build command: `npm run build`, publish directory: `dist` — Netlify picks these up
   automatically from `netlify.toml`.
4. `public/_redirects` (and the matching rule in `netlify.toml`) route every path to
   `index.html` with a 200, which is required for a client-side router like this one —
   without it, refreshing on a page like `/anime/21-one-piece` would 404.
5. Deploy — no environment variables or database needed here either.

## Extending the sitemap

`public/sitemap.xml` currently lists the static routes only, since individual
`/anime/:id` and `/genre/:slug` pages are generated from live, constantly-changing API
data. For stronger SEO, add a small Node script that runs at build time, pulls the
current top/trending anime IDs from Jikan, and appends `<url>` entries for them before
`vercel-build` runs.

## Ad monetization

`<AdSlot size="banner" | "rectangle" />` renders an "Advertisement" placeholder
everywhere ads should eventually go (home, between sections, anime details, schedule,
footer). Once Google AdSense approves the site, replace the placeholder markup inside
`src/components/AdSlot.jsx` with the AdSense `<ins class="adsbygoogle">` snippet — every
placement across the site updates from that one file.

## Legal

AnimeHai does not host, stream, or link to anime episodes, torrents, or pirated content.
It is an information/discovery/tracking platform only, backed by Jikan (MyAnimeList) and
AniList data.
