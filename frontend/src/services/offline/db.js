/**
 * Local Offline Database (IndexedDB via Dexie)
 * -----------------------------------------------------------------------
 * This is the device-local store used when the app has no connectivity.
 * Two jobs:
 *   1. Cache read data (children, visits, etc.) so screens render offline.
 *   2. Queue writes (new attendance, visit reports, forms) until sync.
 *
 * When the backend exists, `syncQueue` records are POSTed in order by
 * the background sync service (src/services/offline/syncEngine.js) and
 * removed on success, or marked 'failed' with a retry count.
 * -----------------------------------------------------------------------
 */
import Dexie from 'dexie'

export const db = new Dexie('ecd_platform_db')

db.version(2).stores({
  // Cached read-only data, keyed by id
  children: 'id, name, center',
  visits: 'id, childId, status, scheduledFor',
  attendance: 'id, childId, status',
  healthAlerts: 'id, childId, severity',
  meals: 'id, childId, type',
  notifications: 'id, read',
  users: 'id, role, center',
  centers: 'id, name',

  // Local drafts (forms in progress, not yet submitted)
  drafts: '++localId, formType, updatedAt',

  // Outbound queue of writes waiting to reach the server
  syncQueue: '++localId, status, createdAt, entity',

  // Geo cache for reverse geocoding
  geoCache: 'key',
})

export default db
