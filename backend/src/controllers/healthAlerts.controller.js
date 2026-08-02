import HealthAlert from '../models/HealthAlert.js'
import Child from '../models/Child.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/AppError.js'
import { notifySupervisorsOfHealthAlert } from '../services/notificationService.js'
import { emitToAdmins } from '../services/socket.js'

/** GET /api/health-alerts?status=&severity= */
export const listHealthAlerts = asyncHandler(async (req, res) => {
  const filter = {}
  if (req.query.status) filter.status = req.query.status
  if (req.query.severity) filter.severity = req.query.severity

  if (['caregiver', 'field_officer'].includes(req.user.role)) {
    const children = await Child.find({ center: req.user.center, isActive: true }).select('_id')
    filter.child = { $in: children.map((c) => c._id) }
  }

  const alerts = await HealthAlert.find(filter)
    .populate({ path: 'child', select: 'name age guardian center photoUrl', populate: { path: 'center', select: 'name' } })
    .sort({ createdAt: -1 })
  res.json(alerts)
})

/** POST /api/health-alerts */
export const createHealthAlert = asyncHandler(async (req, res) => {
  const alert = await HealthAlert.create({ ...req.body, raisedBy: req.user._id })

  // Fire-and-forget: notify supervisors for high/critical severity
  if (['high', 'critical'].includes(alert.severity)) {
    notifySupervisorsOfHealthAlert(alert).catch((err) =>
      console.error('[health-alert] Failed to notify supervisors:', err.message)
    )
  }

  res.status(201).json(alert)

  emitToAdmins('health-alert:created', {
    id: alert._id,
    severity: alert.severity,
    title: alert.title,
    childId: alert.child,
  })
})

/** PATCH /api/health-alerts/:id */
export const updateHealthAlert = asyncHandler(async (req, res) => {
  const updates = { ...req.body }
  if (updates.status === 'resolved' && !updates.resolvedAt) {
    updates.resolvedAt = new Date()
  }
  const alert = await HealthAlert.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
  if (!alert) throw new AppError('Health alert not found', 404)
  res.json(alert)
})
