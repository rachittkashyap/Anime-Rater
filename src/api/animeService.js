// This is the ONLY module the rest of the app should talk to for anime data.
// It hides the fact that there are two upstream APIs: every function tries
// Jikan (primary) first, and if that fails for any reason — timeout, 429,
// 5xx, network error — it transparently retries the same request against
// AniList (secondary) and normalizes the result into one common shape.
// Components never need to know which API actually answered.

import { jikan } from './jikan';
import { anilist } from './anilist';
import { cachedFetch, TTL } from '../utils/cache';
import { getCurrentSeason } from '../utils/formatters';

// ---------------------------------------------------------------------------
// Normalization: map both APIs' very different shapes into one common shape
// used everywhere in the UI.
// ---------------------------------------------------------------------------

function normalizeFromJikan(item) {
  if (!item) return null;
  return {
    id: item.mal_id,
    source: 'jikan',
    title: item.title || item.title_english || 'Untitled',
    titleEnglish: item.title_english || null,
    titleJapanese: item.title_japanese || null,
    image:
      item.images?.webp?.large_image_url ||
      item.images?.jpg?.large_image_url ||
      item.images?.jpg?.image_url ||
      null,
    banner: item.trailer?.images?.maximum_image_url || null,
    rating: item.score ?? null,
    rank: item.rank ?? null,
    popularity: item.popularity ?? null,
    status: item.status || null,
    type: item.type || null,
    season: item.season || null,
    year: item.year || item.aired?.prop?.from?.year || null,
    episodes: item.episodes ?? null,
    duration: item.duration || null,
    genres: (item.genres || []).map((g) => g.name),
    studios: (item.studios || []).map((s) => s.name),
    synopsis: item.synopsis || null,
    trailerUrl: item.trailer?.url || null,
    airing: item.airing ?? false,
    nextEpisodeDate: item.broadcast?.string || null,
    materialSource: item.source || null,
  };
}

function seasonEnumToLower(season) {
  return season ? String(season).toLowerCase() : null;
}

function normalizeFromAniList(item) {
  if (!item) return null;
  const title = item.title?.english || item.title?.romaji || item.title?.native || 'Untitled';
  return {
    id: item.id,
    source: 'anilist',
    title,
    titleEnglish: item.title?.english || null,
    titleJapanese: item.title?.native || null,
    image: item.coverImage?.extraLarge || item.coverImage?.large || null,
    banner: item.bannerImage || null,
    rating: item.averageScore ? item.averageScore / 10 : null,
    rank: item.rankings?.find((r) => r.type === 'RATED')?.rank ?? null,
    popularity: item.popularity ?? null,
    status: item.status || null,
    type: item.format || null,
    season: seasonEnumToLower(item.season),
    year: item.seasonYear || item.startDate?.year || null,
    episodes: item.episodes ?? null,
    duration: item.duration ? `${item.duration} min per ep` : null,
    genres: item.genres || [],
    studios: (item.studios?.nodes || []).map((s) => s.name),
    synopsis: item.description ? item.description.replace(/<[^>]+>/g, '') : null,
    trailerUrl: null,
    airing: item.status === 'RELEASING',
    nextEpisodeDate: item.nextAiringEpisode
      ? new Date(item.nextAiringEpisode.airingAt * 1000).toISOString()
      : null,
    materialSource: item.source || null,
  };
}

// ---------------------------------------------------------------------------
// Fallback runner: try the primary source, fall back to secondary on ANY error.
// ---------------------------------------------------------------------------

async function withFallback(primaryFn, fallbackFn, label) {
  try {
    const result = await primaryFn();
    return { data: result, source: 'jikan' };
  } catch (primaryErr) {
    console.warn(`[animeService] Jikan failed for "${label}" (${primaryErr.message}); falling back to AniList.`);
    try {
      const result = await fallbackFn();
      return { data: result, source: 'anilist' };
    } catch (fallbackErr) {
      console.error(`[animeService] AniList fallback also failed for "${label}" (${fallbackErr.message}).`);
      throw new Error('ANIME_DATA_UNAVAILABLE');
    }
  }
}

// ---------------------------------------------------------------------------
// Public API — one function per feature, each cached and fallback-protected.
// ---------------------------------------------------------------------------

export async function getTrendingAnime(page = 1) {
  return cachedFetch(`trending:${page}`, TTL.TRENDING, async () => {
    const { data, source } = await withFallback(
      () => jikan.getTopAnime('bypopularity', page),
      () => anilist.getTrending(page),
      'getTrendingAnime'
    );
    const list = source === 'jikan' ? data.map(normalizeFromJikan) : data.map(normalizeFromAniList);
    return list.filter(Boolean);
  });
}

export async function getPopularAnime(page = 1) {
  return cachedFetch(`popular:${page}`, TTL.TRENDING, async () => {
    const { data, source } = await withFallback(
      () => jikan.getTopAnime('bypopularity', page),
      () => anilist.getPopular(page),
      'getPopularAnime'
    );
    const list = source === 'jikan' ? data.map(normalizeFromJikan) : data.map(normalizeFromAniList);
    return list.filter(Boolean);
  });
}

export async function getTopRatedAnime(page = 1) {
  return cachedFetch(`toprated:${page}`, TTL.TRENDING, async () => {
    const { data, source } = await withFallback(
      () => jikan.getTopAnime('favorite', page),
      () => anilist.getPopular(page),
      'getTopRatedAnime'
    );
    const list = source === 'jikan' ? data.map(normalizeFromJikan) : data.map(normalizeFromAniList);
    return list.filter(Boolean);
  });
}

export async function getCurrentSeasonAnime(page = 1) {
  const { year, season } = getCurrentSeason();
  return cachedFetch(`season:current:${page}`, TTL.SEASON, async () => {
    const { data, source } = await withFallback(
      () => jikan.getSeasonNow(page),
      () => anilist.getSeason(year, season, page),
      'getCurrentSeasonAnime'
    );
    const list = source === 'jikan' ? data.map(normalizeFromJikan) : data.map(normalizeFromAniList);
    return list.filter(Boolean);
  });
}

export async function getAnimeBySeason(year, season, page = 1) {
  return cachedFetch(`season:${year}:${season}:${page}`, TTL.SEASON, async () => {
    const { data, source } = await withFallback(
      () => jikan.getSeason(year, season, page),
      () => anilist.getSeason(year, season, page),
      'getAnimeBySeason'
    );
    const list = source === 'jikan' ? data.map(normalizeFromJikan) : data.map(normalizeFromAniList);
    return list.filter(Boolean);
  });
}

export async function getUpcomingAnime(page = 1) {
  const { year, season } = getNextSeason();
  return cachedFetch(`upcoming:${page}`, TTL.SEASON, async () => {
    const { data, source } = await withFallback(
      () => jikan.getUpcomingSeason(page),
      () => anilist.getUpcoming(year, season, page),
      'getUpcomingAnime'
    );
    const list = source === 'jikan' ? data.map(normalizeFromJikan) : data.map(normalizeFromAniList);
    return list.filter(Boolean);
  });
}

function getNextSeason() {
  const order = ['winter', 'spring', 'summer', 'fall'];
  const { year, season } = getCurrentSeason();
  const idx = order.indexOf(season);
  const nextIdx = (idx + 1) % 4;
  const nextYear = nextIdx === 0 ? year + 1 : year;
  return { year: nextYear, season: order[nextIdx] };
}

export async function getAiringAnime(page = 1) {
  return cachedFetch(`airing:${page}`, TTL.SCHEDULE, async () => {
    const { data, source } = await withFallback(
      () => jikan.getSeasonNow(page),
      () => anilist.getSeason(getCurrentSeason().year, getCurrentSeason().season, page),
      'getAiringAnime'
    );
    const list = (source === 'jikan' ? data.map(normalizeFromJikan) : data.map(normalizeFromAniList)).filter(
      Boolean
    );
    return list.filter((a) => a.airing || a.status === 'Currently Airing' || a.status === 'RELEASING');
  });
}

export async function getSchedule() {
  return cachedFetch('schedule:week', TTL.SCHEDULE, async () => {
    const { data, source } = await withFallback(
      () => jikan.getSchedules(null, 1),
      () => anilist.getAiringSchedule(),
      'getSchedule'
    );
    if (source === 'jikan') {
      return data.map((item) => ({
        anime: normalizeFromJikan(item),
        episode: null,
        airingAt: item.broadcast?.string || null,
        dayOfWeek: item.broadcast?.day || null,
      }));
    }
    return data.map((entry) => ({
      anime: normalizeFromAniList(entry.media),
      episode: entry.episode,
      airingAt: new Date(entry.airingAt * 1000).toISOString(),
      dayOfWeek: new Date(entry.airingAt * 1000).toLocaleDateString('en-US', { weekday: 'long' }),
    }));
  });
}

export async function searchAnime(query, page = 1, filters = {}) {
  if (!query || !query.trim()) return [];
  const filterKey = JSON.stringify(filters);
  return cachedFetch(`search:${query}:${page}:${filterKey}`, TTL.SEARCH, async () => {
    let extraParams = '';
    if (filters.genre) extraParams += `&genres=${filters.genre}`;
    if (filters.year) extraParams += `&start_date=${filters.year}-01-01&end_date=${filters.year}-12-31`;
    if (filters.type) extraParams += `&type=${filters.type}`;
    if (filters.status) extraParams += `&status=${filters.status}`;
    if (filters.orderBy) extraParams += `&order_by=${filters.orderBy}&sort=desc`;

    const { data, source } = await withFallback(
      () => jikan.searchAnime(query, page, extraParams),
      () => anilist.searchAnime(query, page),
      'searchAnime'
    );
    const list = source === 'jikan' ? data.map(normalizeFromJikan) : data.map(normalizeFromAniList);
    return list.filter(Boolean);
  });
}

export async function getAnimeDetails(id) {
  return cachedFetch(`details:${id}`, TTL.DETAILS, async () => {
    const { data, source } = await withFallback(
      () => jikan.getAnimeById(id),
      () => anilist.getAnimeById(id),
      'getAnimeDetails'
    );
    return source === 'jikan' ? normalizeFromJikan(data) : normalizeFromAniList(data);
  });
}

export async function getAnimeEpisodes(id) {
  return cachedFetch(`episodes:${id}`, TTL.DETAILS, async () => {
    try {
      const data = await jikan.getAnimeEpisodes(id);
      return (data || []).map((ep) => ({
        number: ep.mal_id,
        title: ep.title || `Episode ${ep.mal_id}`,
        aired: ep.aired || null,
        filler: ep.filler || false,
      }));
    } catch {
      // AniList's free schema doesn't expose a full episode list without extra
      // auth scopes, so we degrade gracefully to an empty list here rather
      // than showing an error — episode counts still show on the details page.
      return [];
    }
  });
}

export async function getAnimeRecommendations(id) {
  return cachedFetch(`recs:${id}`, TTL.DETAILS, async () => {
    const { data, source } = await withFallback(
      () => jikan.getAnimeRecommendations(id),
      () => anilist.getRecommendations(id),
      'getAnimeRecommendations'
    );
    if (source === 'jikan') {
      return (data || []).slice(0, 10).map((r) => normalizeFromJikan(r.entry));
    }
    return (data || []).slice(0, 10).map(normalizeFromAniList);
  });
}

export async function getAnimeByGenre(genre, page = 1) {
  return cachedFetch(`genre:${genre}:${page}`, TTL.GENRE, async () => {
    const { data, source } = await withFallback(
      () => jikan.getAnimeByGenre(genre.id, page),
      () => anilist.getByGenre(genre.name, page),
      'getAnimeByGenre'
    );
    const list = source === 'jikan' ? data.map(normalizeFromJikan) : data.map(normalizeFromAniList);
    return list.filter(Boolean);
  });
}

export const GENRES = [
  { id: 1, name: 'Action' },
  { id: 2, name: 'Adventure' },
  { id: 4, name: 'Comedy' },
  { id: 8, name: 'Drama' },
  { id: 10, name: 'Fantasy' },
  { id: 14, name: 'Horror' },
  { id: 22, name: 'Romance' },
  { id: 30, name: 'Sports' },
  { id: 7, name: 'Mystery' },
  { id: 24, name: 'Sci-Fi' },
  { id: 36, name: 'Slice of Life' },
  { id: 37, name: 'Supernatural' },
];
