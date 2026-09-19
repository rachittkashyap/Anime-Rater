import crypto from 'node:crypto';

const sha256 = (v) => crypto.createHash('sha256').update(String(v)).digest();
const safeEqual = (a, b) => a.length === b.length && crypto.timingSafeEqual(a, b);

export function createAuth({ password, secret, ttlMs = 12 * 60 * 60 * 1000 }) {
  const passwordHash = sha256(password);
  // If ADMIN_SECRET isn't set, tokens simply stop working when the server restarts.
  const key = secret ? sha256(secret) : crypto.randomBytes(32);
  const sign = (payload) => crypto.createHmac('sha256', key).update(payload).digest('base64url');

  // ---- login attempt throttling (per IP) ----
  const MAX_FAILS = 8;
  const WINDOW_MS = 15 * 60 * 1000;
  const fails = new Map(); // ip -> { count, resetAt }

  setInterval(() => {
    const now = Date.now();
    for (const [ip, f] of fails) if (f.resetAt < now) fails.delete(ip);
  }, WINDOW_MS).unref?.();

  return {
    isLocked(ip) {
      const f = fails.get(ip);
      return Boolean(f && f.resetAt > Date.now() && f.count >= MAX_FAILS);
    },

    recordFailure(ip) {
      const now = Date.now();
      const f = fails.get(ip);
      if (!f || f.resetAt < now) fails.set(ip, { count: 1, resetAt: now + WINDOW_MS });
      else f.count += 1;
    },

    clearFailures(ip) {
      fails.delete(ip);
    },

    verifyPassword(input) {
      return safeEqual(sha256(input ?? ''), passwordHash);
    },

    issueToken() {
      const expiresAt = Date.now() + ttlMs;
      const payload = String(expiresAt);
      return { token: `${payload}.${sign(payload)}`, expiresAt };
    },

    verifyToken(token) {
      if (typeof token !== 'string') return false;
      const [payload, signature, ...rest] = token.split('.');
      if (!payload || !signature || rest.length) return false;
      const expected = Buffer.from(sign(payload));
      const given = Buffer.from(signature);
      if (!safeEqual(expected, given)) return false;
      return Number(payload) > Date.now();
    },
  };
}
