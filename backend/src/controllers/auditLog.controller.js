import AuditLog from '../models/AuditLog.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { logAudit } from '../utils/audit.js'

/** GET /api/admin/audit-log?action=&page=&limit= */
export const listAuditLog = asyncHandler(async (req, res) => {
  const { action, page = 1, limit = 50 } = req.query
  const filter = {}
  if (action) filter.action = new RegExp(action, 'i')

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actor', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    AuditLog.countDocuments(filter),
  ])

  res.json({ logs, total, page: parseInt(page), limit: parseInt(limit) })
})

/** DELETE /api/admin/audit-log — permanently clears the entire audit trail */
export const clearAuditLog = asyncHandler(async (req, res) => {
  await AuditLog.deleteMany({})

  // Recorded after the wipe, so this becomes the first (and only) entry —
  // an explicit record that the log was cleared, by whom and when.
  await logAudit({
    actor: req.user._id,
    action: 'audit_log.clear',
    ipAddress: req.ip,
  })

  res.json({ message: 'Audit log cleared' })
})
