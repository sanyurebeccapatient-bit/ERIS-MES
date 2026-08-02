import User from '../models/User.js'
import PinResetRequest from '../models/PinResetRequest.js'
import Notification from '../models/Notification.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { logAudit } from '../utils/audit.js'
import { normalizePhone } from '../utils/phone.js'

/**
 * POST /api/auth/request-pin-reset  { phone }
 * Public (unauthenticated — the whole point is the user is locked out).
 * Creates a pending request and notifies every admin/supervisor.
 * Always responds with a generic success message so the endpoint can't be
 * used to probe which phone numbers are registered.
 */
export const requestPinReset = asyncHandler(async (req, res) => {
  const { phone } = req.body
  if (!phone) throw new AppError('Phone number is required', 400)

  const genericResponse = {
    message: 'If this phone number is registered, an admin has been notified and will reset your PIN shortly.',
  }

  const user = await User.findOne({ phone: normalizePhone(phone), isActive: true })
  if (!user) {
    // Don't reveal whether the phone number exists
    return res.json(genericResponse)
  }

  // Avoid piling up duplicate pending requests for the same user
  const existing = await PinResetRequest.findOne({ user: user._id, status: 'pending' })
  if (!existing) {
    await PinResetRequest.create({ user: user._id, phone: user.phone })

    const admins = await User.find({ role: { $in: ['admin', 'supervisor'] }, isActive: true })
    await Promise.all(
      admins.map((admin) =>
        Notification.create({
          user: admin._id,
          title: 'PIN reset requested',
          body: `${user.name} (${user.phone}) requested a PIN reset.`,
          type: 'system',
          relatedEntity: { kind: null, id: null },
        })
      )
    )
  }

  res.json(genericResponse)
})

/** GET /api/admin/pin-reset-requests?status= */
export const listPinResetRequests = asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query
  const filter = status === 'all' ? {} : { status }
  const requests = await PinResetRequest.find(filter)
    .populate('user', 'name phone role center')
    .populate('resolvedBy', 'name')
    .sort({ createdAt: -1 })
  res.json(requests)
})

/**
 * POST /api/admin/pin-reset-requests/:id/resolve  { newPin }
 * Sets the user's new PIN and marks the request resolved.
 */
export const resolvePinResetRequest = asyncHandler(async (req, res) => {
  const { newPin } = req.body
  if (!newPin || !/^\d{6}$/.test(newPin)) {
    throw new AppError('New PIN must be exactly 6 digits', 400)
  }

  const request = await PinResetRequest.findById(req.params.id)
  if (!request) throw new AppError('Request not found', 404)
  if (request.status !== 'pending') throw new AppError('This request has already been handled', 409)

  const user = await User.findById(request.user)
  if (!user) throw new AppError('User not found', 404)

  await user.setPin(newPin)
  // A reset PIN should not leave old sessions valid on other devices
  user.refreshTokens = []
  await user.save()

  request.status = 'resolved'
  request.resolvedBy = req.user._id
  request.resolvedAt = new Date()
  await request.save()

  await logAudit({
    actor: req.user._id,
    action: 'user.pin_reset',
    entity: { kind: 'User', id: user._id },
    ipAddress: req.ip,
  })

  res.json({ message: 'PIN reset successfully', request })
})

/** DELETE /api/admin/pin-reset-requests/:id — dismiss without resetting */
export const cancelPinResetRequest = asyncHandler(async (req, res) => {
  const request = await PinResetRequest.findById(req.params.id)
  if (!request) throw new AppError('Request not found', 404)
  if (request.status !== 'pending') throw new AppError('This request has already been handled', 409)

  request.status = 'cancelled'
  request.resolvedBy = req.user._id
  request.resolvedAt = new Date()
  await request.save()

  res.json({ message: 'Request dismissed', request })
})
