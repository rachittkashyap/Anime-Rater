// Simple cache layer with TTL, backed by localStorage so it survives reloads.
// Falls back silently to an in-memory Map if localStorage is unavailable.

const memoryStore = new Map();
const PREFIX = 'animehai_cache:';

function hasLocalStorage() {
  try {
    const testKey = '__animehai_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const useLS = typeof window !== 'undefined' && hasLocalStorage();

function readRaw(key) {
  if (useLS) {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  }
  return memoryStore.get(key) || null;
}

function writeRaw(key, value) {
  if (useLS) {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Storage full or blocked — degrade gracefully, don't crash the app.
    }
  } else {
    memoryStore.set(key, value);
  }
}

/**
 * Get a cached value if it hasn't expired.
 */
export function getCached(key) {
  const entry = readRaw(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) return null;
  return entry.value;
}

/**
 * Store a value with a time-to-live in milliseconds.
 */
export function setCached(key, value, ttlMs) {
  writeRaw(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Wrap an async fetcher with caching + request de-duplication, so multiple
 * components asking for the same data at the same time only trigger one
 * network request.
 */
const inFlight = new Map();

export async function cachedFetch(key, ttlMs, fetcher) {
  const cached = getCached(key);
  if (cached !== null) return cached;

  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = (async () => {
    try {
      const result = await fetcher();
      setCached(key, result, ttlMs);
      return result;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

export const TTL = {
  TRENDING: 45 * 60 * 1000, // 30-60 min
  SEASON: 3 * 60 * 60 * 1000, // 1-6 hours
  DETAILS: 12 * 60 * 60 * 1000, // 6-24 hours
  SCHEDULE: 30 * 60 * 1000, // 15-60 min
  SEARCH: 10 * 60 * 1000,
  GENRE: 60 * 60 * 1000,
};
