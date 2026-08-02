/**
 * Request Deduplication
 * -----------------------------------------------------------------------
 * Prevents duplicate in-flight API calls for the same URL+params.
 * Returns the same promise for concurrent identical requests.
 * -----------------------------------------------------------------------
 */

const inflight = new Map()

/**
 * Wraps an async function so that concurrent calls with the same key
 * return the same promise instead of firing multiple requests.
 *
 * @param {string} key - Dedup key (e.g. URL + serialized params)
 * @param {Function} fn - The async function to deduplicate
 * @returns {Promise}
 */
export function dedupRequest(key, fn) {
  if (inflight.has(key)) return inflight.get(key)

  const promise = fn().finally(() => inflight.delete(key))
  inflight.set(key, promise)
  return promise
}

/** Clear all in-flight dedup entries (e.g. on logout) */
export function clearDedupCache() {
  inflight.clear()
}
