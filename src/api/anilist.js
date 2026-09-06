// Low-level client for the AniList GraphQL API (https://anilist.co/graphiql)
// — our SECONDARY source, used automatically whenever Jikan is unavailable,
// rate-limited, or errors out. No API key required.

const URL = import.meta.env.VITE_ANILIST_URL || 'https://graphql.anilist.co';
const DEFAULT_TIMEOUT = 8000;

async function anilistRequest(query, variables = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });

    if (res.status === 429) throw new Error('ANILIST_RATE_LIMITED');
    if (!res.ok) throw new Error(`ANILIST_HTTP_${res.status}`);

    const json = await res.json();
    if (json.errors) throw new Error('ANILIST_GRAPHQL_ERROR');
    return json.data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('ANILIST_TIMEOUT');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  coverImage { large extraLarge }
  bannerImage
  averageScore
  popularity
  rankings { rank type context }
  status
  format
  season
  seasonYear
  episodes
  duration
  genres
  studios { nodes { name } }
  source
  description(asHtml: false)
  startDate { year month day }
  nextAiringEpisode { episode airingAt timeUntilAiring }
`;

export const anilist = {
  getTrending: async (page = 1, perPage = 20) => {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(sort: TRENDING_DESC, type: ANIME) { ${MEDIA_FIELDS} }
        }
      }`;
    const data = await anilistRequest(query, { page, perPage });
    return data.Page.media;
  },

  getPopular: async (page = 1, perPage = 20) => {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(sort: POPULARITY_DESC, type: ANIME) { ${MEDIA_FIELDS} }
        }
      }`;
    const data = await anilistRequest(query, { page, perPage });
    return data.Page.media;
  },

  getSeason: async (year, season, page = 1, perPage = 20) => {
    const query = `
      query ($year: Int, $season: MediaSeason, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(seasonYear: $year, season: $season, type: ANIME, sort: POPULARITY_DESC) { ${MEDIA_FIELDS} }
        }
      }`;
    const data = await anilistRequest(query, { year, season: season.toUpperCase(), page, perPage });
    return data.Page.media;
  },

  getUpcoming: async (year, season, page = 1, perPage = 20) => {
    const query = `
      query ($year: Int, $season: MediaSeason, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(seasonYear: $year, season: $season, type: ANIME, sort: POPULARITY_DESC, status: NOT_YET_RELEASED) { ${MEDIA_FIELDS} }
        }
      }`;
    const data = await anilistRequest(query, { year, season: season.toUpperCase(), page, perPage });
    return data.Page.media;
  },

  getAiringSchedule: async (page = 1, perPage = 25) => {
    const now = Math.floor(Date.now() / 1000);
    const weekLater = now + 7 * 24 * 60 * 60;
    const query = `
      query ($page: Int, $perPage: Int, $start: Int, $end: Int) {
        Page(page: $page, perPage: $perPage) {
          airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
            episode
            airingAt
            media { ${MEDIA_FIELDS} }
          }
        }
      }`;
    const data = await anilistRequest(query, { page, perPage, start: now - 86400, end: weekLater });
    return data.Page.airingSchedules;
  },

  searchAnime: async (search, page = 1, perPage = 20) => {
    const query = `
      query ($search: String, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(search: $search, type: ANIME) { ${MEDIA_FIELDS} }
        }
      }`;
    const data = await anilistRequest(query, { search, page, perPage });
    return data.Page.media;
  },

  getAnimeById: async (id) => {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          ${MEDIA_FIELDS}
          relations { edges { relationType node { id title { romaji } coverImage { large } } } }
        }
      }`;
    const data = await anilistRequest(query, { id: Number(id) });
    return data.Media;
  },

  getRecommendations: async (id) => {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          recommendations(sort: RATING_DESC, perPage: 10) {
            nodes { mediaRecommendation { ${MEDIA_FIELDS} } }
          }
        }
      }`;
    const data = await anilistRequest(query, { id: Number(id) });
    return (data.Media.recommendations.nodes || []).map((n) => n.mediaRecommendation).filter(Boolean);
  },

  getByGenre: async (genre, page = 1, perPage = 20) => {
    const query = `
      query ($genre: String, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(genre: $genre, type: ANIME, sort: POPULARITY_DESC) { ${MEDIA_FIELDS} }
        }
      }`;
    const data = await anilistRequest(query, { genre, page, perPage });
    return data.Page.media;
  },

  getGenres: async () => {
    const query = `query { GenreCollection }`;
    const data = await anilistRequest(query);
    return data.GenreCollection;
  },
};
