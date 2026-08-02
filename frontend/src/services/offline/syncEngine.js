/**
 * Sync Engine (foundation)
 * -----------------------------------------------------------------------
 * Offline write queue with exponential backoff retry, batch flushing,
 * and last-write-wins conflict resolution.
 * -----------------------------------------------------------------------
 */
import { db } from './db'
import { apiClient } from '../api/client'
import { cacheSet, cacheClear } from './cacheService'

const MAX_RETRIES = 5
const BASE_DELAY_MS = 1000

/**
 * Queue a write made while offline (or optimistically, always).
 * @param {string} entity - e.g. 'attendance', 'visit', 'healthAlert'
 * @param {string} method - 'post' | 'put' | 'patch' | 'delete'
 * @param {string} url - API path, e.g. '/attendance'
 * @param {object} payload
 */
export async function queueWrite(entity, method, url, payload) {
  const localId = await db.syncQueue.add({
    entity,
    method,
    url,
    payload,
    status: 'pending',
    retries: 0,
    createdAt: new Date().toISOString(),
  })
  return localId
}

/**
 * Write immediately when online so the UI reflects the change right away
 * (no waiting for the next sync cycle). Falls back to the offline queue
 * only if the direct request fails — most commonly because the device is
 * actually offline, but also covers a dropped connection mid-request.
 *
 * Returns { data, queued } — `data` is the server response when the write
 * went through directly (null when queued), and `queued` tells the caller
 * whether it landed in the offline queue instead.
 */
export async function submitOrQueue(entity, method, url, payload) {
  if (navigator.onLine) {
    try {
      const data = await apiClient[method](url, payload)
      return { data, queued: false }
    } catch (err) {
      // Fall through to queueing below — covers a request that failed
      // because connectivity dropped between the check above and the call.
    }
  }
  await queueWrite(entity, method, url, payload)
  return { data: null, queued: true }
}

/** Exponential backoff delay for retries */
function backoffDelay(retries) {
  return Math.min(BASE_DELAY_MS * Math.pow(2, retries), 60000)
}

/** Attempt to send all pending queue items. Called on reconnect + interval. */
export async function flushQueue() {
  const pending = await db.syncQueue.where('status').equals('pending').toArray()
  // Batch: only retry items whose backoff has elapsed
  const now = Date.now()
  const ready = pending.filter(item => {
    if (!item.lastRetryAt) return true
    const delay = backoffDelay(item.retries || 0)
    return now - item.lastRetryAt >= delay
  })

  for (const item of ready) {
    try {
      await db.syncQueue.update(item.localId, { status: 'syncing', lastRetryAt: now })
      await apiClient[item.method](item.url, item.payload)
      await db.syncQueue.delete(item.localId)
    } catch (err) {
      const retries = (item.retries || 0) + 1
      const isExhausted = retries >= MAX_RETRIES
      await db.syncQueue.update(item.localId, {
        status: err.isOffline ? 'pending' : (isExhausted ? 'failed' : 'pending'),
        retries,
        lastError: err.message,
        lastRetryAt: Date.now(),
      })
      // Stop the flush loop on the first offline failure
      if (err.isOffline) break
    }
  }
}

export async function getPendingCount() {
  return db.syncQueue.where('status').anyOf(['pending', 'failed']).count()
}

let intervalId = null

export function startAutoSync(intervalMs = 30000) {
  if (intervalId) return
  window.addEventListener('online', flushQueue)
  intervalId = setInterval(() => {
    if (navigator.onLine) flushQueue()
  }, intervalMs)
}

export function stopAutoSync() {
  if (intervalId) clearInterval(intervalId)
  intervalId = null
  window.removeEventListener('online', flushQueue)
}
