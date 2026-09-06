// Central place for turning possibly-missing API data into safe display values.
// Nothing in the UI should ever render "undefined", "null" or "NaN".

export const NA = 'N/A';

export function safe(value, fallback = NA) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'number' && Number.isNaN(value)) return fallback;
  if (typeof value === 'string' && value.trim() === '') return fallback;
  return value;
}

export function safeRating(score) {
  if (score === undefined || score === null || Number.isNaN(Number(score))) return NA;
  return Number(score).toFixed(1);
}

export function safeEpisodes(count) {
  if (!count || Number.isNaN(Number(count))) return 'Ongoing';
  return `${count} Episode${count === 1 ? '' : 's'}`;
}

export function safeYear(dateOrYear) {
  if (!dateOrYear) return NA;
  if (typeof dateOrYear === 'number') return String(dateOrYear);
  const year = new Date(dateOrYear).getFullYear();
  return Number.isNaN(year) ? NA : String(year);
}

export function safeGenres(genres) {
  if (!Array.isArray(genres) || genres.length === 0) return [NA];
  return genres;
}

export function truncate(text, maxLength = 160) {
  const safeText = safe(text, '');
  if (safeText === NA || safeText.length <= maxLength) return safeText;
  return `${safeText.slice(0, maxLength).trim()}…`;
}

export function slugify(title) {
  return safe(title, 'anime')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Detect current anime season the same way the site should — no manual updates.
export function getCurrentSeason(date = new Date()) {
  const month = date.getMonth(); // 0-indexed
  const year = date.getFullYear();
  let season;
  if (month >= 0 && month <= 2) season = 'winter';
  else if (month >= 3 && month <= 5) season = 'spring';
  else if (month >= 6 && month <= 8) season = 'summer';
  else season = 'fall';
  return { year, season };
}

export function capitalize(word) {
  const s = safe(word, '');
  if (s === NA) return NA;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
