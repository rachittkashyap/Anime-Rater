# AnimeHai.in

Automated anime discovery & tracking platform. React + Vite, no backend, no database,
no AI API. All anime data comes from free public APIs and is fetched live/cached in the
browser.

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
cp .env.example .env   # optional — defaults already point at the public endpoints
npm run dev             # start local dev server
npm run build            # production build to /dist
npm run preview          # preview the production build locally
```

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
