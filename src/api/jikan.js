// Low-level client for the Jikan API (https://docs.api.jikan.moe/) — our
// PRIMARY anime data source. No API key required.
//
// Handles: timeouts, 429 rate-limit backoff, retries, and network errors.
// Every exported function throws on failure so the caller (animeService.js)
// can decide to fall back to AniList.

const BASE_URL = import.meta.env.VITE_JIKAN_BASE_URL || 'https://api.jikan.moe/v4';

const DEFAULT_TIMEOUT = 8000;
const MAX_RETRIES = 2;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function jikanRequest(path, { retries = MAX_RETRIES } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const res = await fetch(`${BASE_URL}${path}`, { signal: controller.signal });

    if (res.status === 429) {
      if (retries <= 0) throw new Error('JIKAN_RATE_LIMITED');
      // Jikan's public limiter is roughly 3 req/s, 60 req/min — back off and retry.
      await sleep(700 * (MAX_RETRIES - retries + 1));
      return jikanRequest(path, { retries: retries - 1 });
    }

    if (!res.ok) {
      throw new Error(`JIKAN_HTTP_${res.status}`);
    }

    const json = await res.json();
    return json.data;
  } catch (err) {
    if (err.name === 'AbortError') {
      if (retries > 0) return jikanRequest(path, { retries: retries - 1 });
      throw new Error('JIKAN_TIMEOUT');
    }
    if (retries > 0 && !String(err.message).startsWith('JIKAN_HTTP_4')) {
      await sleep(500);
      return jikanRequest(path, { retries: retries - 1 });
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const jikan = {
  getTopAnime: (filter = 'bypopularity', page = 1) =>
    jikanRequest(`/top/anime?filter=${filter}&page=${page}&limit=20`),

  getSeasonNow: (page = 1) => jikanRequest(`/seasons/now?page=${page}&limit=20`),

  getSeason: (year, season, page = 1) =>
    jikanRequest(`/seasons/${year}/${season}?page=${page}&limit=20`),

  getUpcomingSeason: (page = 1) => jikanRequest(`/seasons/upcoming?page=${page}&limit=20`),

  getSchedules: (filter = null, page = 1) =>
    jikanRequest(`/schedules${filter ? `?filter=${filter}` : ''}${filter ? '&' : '?'}page=${page}&limit=20`),

  searchAnime: (query, page = 1, extraParams = '') =>
    jikanRequest(`/anime?q=${encodeURIComponent(query)}&page=${page}&limit=20&sfw=true${extraParams}`),

  getAnimeById: (id) => jikanRequest(`/anime/${id}/full`),

  getAnimeEpisodes: (id, page = 1) => jikanRequest(`/anime/${id}/episodes?page=${page}`),

  getAnimeRecommendations: (id) => jikanRequest(`/anime/${id}/recommendations`),

  getAnimeCharacters: (id) => jikanRequest(`/anime/${id}/characters`),

  getAnimeByGenre: (genreId, page = 1) =>
    jikanRequest(`/anime?genres=${genreId}&order_by=popularity&page=${page}&limit=20&sfw=true`),

  getGenres: () => jikanRequest('/genres/anime'),
};
