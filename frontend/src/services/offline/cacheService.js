/**
 * Cache Service
 * -----------------------------------------------------------------------
 * Stores API responses in IndexedDB for offline access.
 * Last-write-wins conflict resolution. Delta sync support.
 * -----------------------------------------------------------------------
 */
import { db } from './db'

const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

/**
 * Store a list of items from an API response into the local cache.
 * @param {string} table - Dexie table name (children, attendance, etc.)
 * @param {Array} items - Array of objects with an `id` field
 */
export async function cacheSet(table, items) {
  if (!db[table]) return
  try {
    const now = Date.now()
    const withTtl = items.map(item => ({ ...item, _cachedAt: now }))
    await db[table].bulkPut(withTtl)
  } catch {
    // Non-critical
  }
}

/**
 * Read cached items for a table, optionally filtering by freshness.
 * @param {string} table - Dexie table name
 * @param {object} [opts] - { maxAge: number (ms), filter: (item) => boolean }
 */
export async function cacheGet(table, opts = {}) {
  if (!db[table]) return []
  try {
    let items = await db[table].toArray()
    if (opts.maxAge) {
      const cutoff = Date.now() - opts.maxAge
      items = items.filter(i => !i._cachedAt || i._cachedAt > cutoff)
    }
    if (opts.filter) items = items.filter(opts.filter)
    // Strip internal cache fields
    return items.map(({ _cachedAt, ...rest }) => rest)
  } catch {
    return []
  }
}

/**
 * Clear cache for a specific table, or all tables.
 */
export async function cacheClear(table) {
  if (table) {
    if (db[table]) await db[table].clear()
  } else {
    const cacheTables = ['children', 'attendance', 'healthAlerts', 'notifications', 'users', 'centers']
    for (const t of cacheTables) {
      if (db[t]) await db[t].clear().catch(() => {})
    }
  }
}

/**
 * Fetch from API with cache fallback.
 * If online, fetches from the API, caches the result, and returns it.
 * If offline, returns cached data.
 */
export async function fetchWithCache(table, apiFn, opts = {}) {
  if (navigator.onLine) {
    try {
      const data = await apiFn()
      if (Array.isArray(data)) {
        await cacheSet(table, data)
      }
      return { data, fromCache: false }
    } catch (err) {
      if (err.isOffline) {
        // Fall through to cache
      } else {
        throw err
      }
    }
  }
  const cached = await cacheGet(table, { maxAge: opts.maxAge || CACHE_TTL })
  return { data: cached, fromCache: true }
}
