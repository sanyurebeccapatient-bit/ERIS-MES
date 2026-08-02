import User from '../models/User.js'
import Child from '../models/Child.js'
import Attendance from '../models/Attendance.js'
import Meal from '../models/Meal.js'
import HealthAlert from '../models/HealthAlert.js'
import Visit from '../models/Visit.js'
import Report from '../models/Report.js'
import Notification from '../models/Notification.js'
import PinResetRequest from '../models/PinResetRequest.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/AppError.js'
import { logAudit } from '../utils/audit.js'
import { normalizePhone } from '../utils/phone.js'

/** GET /api/admin/users?role=&center=&search=&page=&limit= */
export const listUsers = asyncHandler(async (req, res) => {
  const { role, center, search, page = 1, limit = 20 } = req.query
  const filter = {}
  if (role) filter.role = role
  if (center) filter.center = center
  if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }]

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const [users, total] = await Promise.all([
    User.find(filter).populate('center', 'name').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    User.countDocuments(filter),
  ])

  res.json({ users: users.map((u) => u.toSafeJSON()), total, page: parseInt(page), limit: parseInt(limit) })
})

/** POST /api/admin/users */
export const createUser = asyncHandler(async (req, res) => {
  const { name, phone, pin, role, center } = req.body
  if (!name || !phone || !pin) throw new AppError('name, phone, and pin are required', 400)
  if (!/^\d{6}$/.test(pin)) throw new AppError('PIN must be exactly 6 digits', 400)

  const existing = await User.findOne({ phone: normalizePhone(phone) })
  if (existing) throw new AppError('A user with this phone number already exists', 409)

  const user = new User({ name, phone, role: role || 'caregiver', center: center || null })
  await user.setPin(pin)
  await user.save()

  await logAudit({
    actor: req.user._id,
    action: 'user.create',
    entity: { kind: 'User', id: user._id },
    metadata: { role: user.role, name: user.name },
    ipAddress: req.ip,
  })

  await user.populate('center', 'name')

  res.status(201).json(user.toSafeJSON())
})

/** PATCH /api/admin/users/:id */
export const updateUser = asyncHandler(async (req, res) => {
  const { name, phone, role, center, isActive } = req.body
  const updates = {}
  if (name !== undefined) updates.name = name
  if (role !== undefined) updates.role = role
  if (center !== undefined) updates.center = center
  if (isActive !== undefined) updates.isActive = isActive

  const before = await User.findById(req.params.id)
  if (!before) throw new AppError('User not found', 404)

  if (phone !== undefined && normalizePhone(phone) !== before.phone) {
    const existing = await User.findOne({ phone: normalizePhone(phone), _id: { $ne: before._id } })
    if (existing) throw new AppError('A user with this phone number already exists', 409)
    updates.phone = phone
  }

  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).populate(
    'center',
    'name'
  )

  if (role && role !== before.role) {
    await logAudit({
      actor: req.user._id,
      action: 'user.role_change',
      entity: { kind: 'User', id: user._id },
      metadata: { from: before.role, to: role },
      ipAddress: req.ip,
    })
  }

  res.json(user.toSafeJSON())
})

/** POST /api/admin/users/:id/reset-pin  { newPin } — direct reset, no pending request needed */
export const resetUserPin = asyncHandler(async (req, res) => {
  const { newPin } = req.body
  if (!newPin || !/^\d{6}$/.test(newPin)) {
    throw new AppError('New PIN must be exactly 6 digits', 400)
  }

  const user = await User.findById(req.params.id)
  if (!user) throw new AppError('User not found', 404)

  await user.setPin(newPin)
  user.refreshTokens = []
  await user.save()

  await logAudit({
    actor: req.user._id,
    action: 'user.pin_reset',
    entity: { kind: 'User', id: user._id },
    metadata: { name: user.name },
    ipAddress: req.ip,
  })

  res.json({ message: 'PIN reset successfully' })
})

/** DELETE /api/admin/users/:id — deactivate, never hard-delete */
export const deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })
  if (!user) throw new AppError('User not found', 404)

  await logAudit({
    actor: req.user._id,
    action: 'user.deactivate',
    entity: { kind: 'User', id: user._id },
    metadata: { name: user.name },
    ipAddress: req.ip,
  })

  res.json({ message: 'User deactivated' })
})

/** DELETE /api/admin/users/:id/remove — permanently removes an already-deactivated user */
export const removeUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) throw new AppError('User not found', 404)
  if (user.isActive) throw new AppError('User must be deactivated before removal', 400)

  // Cascade delete: removing a caregiver also removes every child assigned
  // to them and everything tied to those children (attendance, meals,
  // health alerts, visits, reports), plus every record the caregiver
  // authored directly (visits, reports, notifications, pending PIN resets).
  const children = await Child.find({ assignedCaregiver: user._id }).select('_id')
  const childIds = children.map((c) => c._id)

  if (childIds.length) {
    await Promise.all([
      Attendance.deleteMany({ child: { $in: childIds } }),
      Meal.deleteMany({ child: { $in: childIds } }),
      HealthAlert.deleteMany({ child: { $in: childIds } }),
      Visit.deleteMany({ child: { $in: childIds } }),
      Report.deleteMany({ child: { $in: childIds } }),
    ])
    await Child.deleteMany({ _id: { $in: childIds } })
  }

  await Promise.all([
    // Records authored/assigned to this caregiver, independent of which
    // child they concern (covers visits/reports for children not assigned
    // to them, e.g. field officers, plus alerts they personally raised).
    Visit.deleteMany({ assignedTo: user._id }),
    Report.deleteMany({ submittedBy: user._id }),
    HealthAlert.deleteMany({ raisedBy: user._id }),
    Attendance.deleteMany({ recordedBy: user._id }),
    Meal.deleteMany({ recordedBy: user._id }),
    Notification.deleteMany({ user: user._id }),
    PinResetRequest.deleteMany({ user: user._id }),
  ])

  await User.findByIdAndDelete(req.params.id)

  await logAudit({
    actor: req.user._id,
    action: 'user.remove',
    entity: { kind: 'User', id: user._id },
    metadata: { name: user.name, childrenRemoved: childIds.length },
    ipAddress: req.ip,
  })

  res.json({ message: 'User removed' })
})
