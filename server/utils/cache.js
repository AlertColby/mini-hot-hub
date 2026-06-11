/** @typedef {{ data: unknown; expiresAt: number }} CacheEntry */

/** @type {Map<string, CacheEntry>} */
const store = new Map();

const DEFAULT_TTL_SEC = Number(process.env.CACHE_TTL ?? 600);

/**
 * @template T
 * @param {string} key
 * @returns {T | undefined}
 */
export function getCache(key) {
  const entry = store.get(key);
  if (!entry) return undefined;

  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }

  return /** @type {T} */ (entry.data);
}

/**
 * @template T
 * @param {string} key
 * @param {T} data
 * @param {number} [ttlSec]
 */
export function setCache(key, data, ttlSec) {
  const ttl = ttlSec ?? DEFAULT_TTL_SEC;
  store.set(key, {
    data,
    expiresAt: Date.now() + ttl * 1000,
  });
}
