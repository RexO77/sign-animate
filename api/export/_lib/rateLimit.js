import { ApiError } from './errors.js';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;

const limitStore = globalThis.__signanimateExportRateLimit || new Map();
globalThis.__signanimateExportRateLimit = limitStore;

export function enforceRateLimit(ip) {
  const key = ip || 'unknown';
  const now = Date.now();
  const entry = limitStore.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  entry.count += 1;
  limitStore.set(key, entry);

  if (entry.count > RATE_LIMIT_MAX) {
    throw new ApiError(429, 'RATE_LIMITED', 'Too many export requests. Please retry shortly.', {
      retryAfterMs: Math.max(entry.resetAt - now, 1000),
    });
  }

  return {
    remaining: Math.max(RATE_LIMIT_MAX - entry.count, 0),
    resetAt: entry.resetAt,
  };
}
