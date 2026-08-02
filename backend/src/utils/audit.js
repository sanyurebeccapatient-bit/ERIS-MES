import AuditLog from '../models/AuditLog.js'

/**
 * Records an audit entry. Intentionally does not throw — a logging failure
 * should never break the primary request. Call this after a successful
 * sensitive operation (role changes, deletions, approvals, exports).
 */
export async function logAudit({ actor, action, entity = {}, metadata = {}, ipAddress = null }) {
  try {
    await AuditLog.create({ actor, action, entity, metadata, ipAddress })
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err.message)
  }
}
