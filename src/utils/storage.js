// Watchlist persistence — pure localStorage, no backend, no login.

const WATCHLIST_KEY = 'animehai_watchlist';

function safeParse(raw, fallback) {
  try {
    return JSON.parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
}

export function getWatchlist() {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(WATCHLIST_KEY);
  return raw ? safeParse(raw, []) : [];
}

function saveWatchlist(list) {
  window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
  // Let other components (e.g. Navbar badge) know the list changed.
  window.dispatchEvent(new CustomEvent('animehai:watchlist-changed'));
}

export function isInWatchlist(id) {
  return getWatchlist().some((item) => String(item.id) === String(id));
}

export function addToWatchlist(anime) {
  const list = getWatchlist();
  if (list.some((item) => String(item.id) === String(anime.id))) return list;
  const entry = {
    id: anime.id,
    title: anime.title,
    image: anime.image,
    rating: anime.rating,
    episodes: anime.episodes,
    status: anime.status,
    addedAt: Date.now(),
  };
  const updated = [entry, ...list];
  saveWatchlist(updated);
  return updated;
}

export function removeFromWatchlist(id) {
  const updated = getWatchlist().filter((item) => String(item.id) !== String(id));
  saveWatchlist(updated);
  return updated;
}

export function toggleWatchlist(anime) {
  return isInWatchlist(anime.id) ? removeFromWatchlist(anime.id) : addToWatchlist(anime);
}
