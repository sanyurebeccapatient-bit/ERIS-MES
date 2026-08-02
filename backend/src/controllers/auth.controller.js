import User from '../models/User.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { signAccessToken, generateRefreshToken, refreshTokenExpiryDate } from '../utils/tokens.js'
import { logAudit } from '../utils/audit.js'
import { normalizePhone } from '../utils/phone.js'

/**
 * Builds a query that matches a phone number regardless of stored formatting
 * (with or without spaces) — needed because some accounts were created
 * before phone numbers were normalized on write, and may still have spaces
 * saved verbatim (e.g. "+250 792 914 200" instead of "+250792914200").
 */
function phoneMatchQuery(rawPhone) {
  const normalized = normalizePhone(rawPhone)
  const digitsOnly = normalized.replace(/\D/g, '')
  // Matches the digits in order, allowing any whitespace between them
  const spaced = digitsOnly.split('').join('\\s*')
  return { $or: [{ phone: normalized }, { phone: new RegExp(`^\\+?${spaced}$`) }] }
}

/** POST /api/auth/login  { phone, pin } */
export const login = asyncHandler(async (req, res) => {
  const { phone, pin } = req.body
  if (!phone || !pin) throw new AppError('Phone and PIN are required', 400)

  const user = await User.findOne({ ...phoneMatchQuery(phone), isActive: true })
    .select('+pinHash')
    .populate('center', 'name district')
  if (!user) throw new AppError('Invalid phone number or PIN', 401)

  const valid = await user.comparePin(pin)
  if (!valid) throw new AppError('Invalid phone number or PIN', 401)

  const accessToken = signAccessToken(user)
  const refreshToken = generateRefreshToken()

  user.refreshTokens.push({ token: refreshToken, expiresAt: refreshTokenExpiryDate() })
  user.lastLoginAt = new Date()
  // Keep at most 5 concurrent device sessions
  if (user.refreshTokens.length > 5) user.refreshTokens = user.refreshTokens.slice(-5)
  // Normalizing on read-then-save heals any legacy spaced-out phone value
  // the next time this account logs in, without a separate migration step.
  user.phone = normalizePhone(user.phone)
  user.markModified('phone')
  await user.save()

  await logAudit({ actor: user._id, action: 'auth.login', ipAddress: req.ip })

  res.json({
    user: user.toSafeJSON(),
    accessToken,
    refreshToken,
  })
})

/** POST /api/auth/refresh  { refreshToken } */
export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) throw new AppError('Refresh token required', 400)

  // refreshTokens.token has `select: false` in the schema, so it must be
  // explicitly re-selected here — otherwise every subdocument comes back
  // with `token: undefined` and the `.find()` below never matches,
  // causing every refresh attempt to fail with "Refresh token expired"
  // even when the token is perfectly valid.
  const user = await User.findOne({ 'refreshTokens.token': refreshToken }).select('+refreshTokens.token')
  if (!user) throw new AppError('Invalid refresh token', 401)

  const stored = user.refreshTokens.find((t) => t.token === refreshToken)
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError('Refresh token expired', 401)
  }

  // Sliding session: extend this refresh token's expiry on every use so an
  // actively-used session stays logged in indefinitely, and only expires
  // after a period of true inactivity (or an explicit logout).
  stored.expiresAt = refreshTokenExpiryDate()
  await user.save()

  const accessToken = signAccessToken(user)
  res.json({ accessToken })
})

/** POST /api/auth/logout  { refreshToken } */
export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body
  if (refreshToken && req.user) {
    // req.user was loaded by requireAuth without re-selecting the
    // select:false `refreshTokens.token` field, so every entry's `.token`
    // would read as undefined here and the old filter-then-save approach
    // silently kept every token instead of revoking the one being logged
    // out. An atomic $pull avoids depending on that field being selected.
    await User.updateOne({ _id: req.user._id }, { $pull: { refreshTokens: { token: refreshToken } } })
  }
  res.json({ message: 'Logged out' })
})

/** GET /api/auth/me */
export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('center', 'name district')
  res.json(user.toSafeJSON())
})

/** PATCH /api/auth/me  { name?, phone?, avatarUrl? } — self-service profile edit */
export const updateMe = asyncHandler(async (req, res) => {
  const { name, phone, avatarUrl } = req.body
  const updates = {}
  if (name !== undefined) updates.name = name
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl

  if (phone !== undefined && normalizePhone(phone) !== req.user.phone) {
    const normalized = normalizePhone(phone)
    const existing = await User.findOne({ phone: normalized, _id: { $ne: req.user._id } })
    if (existing) throw new AppError('A user with this phone number already exists', 409)
    updates.phone = normalized
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).populate(
    'center',
    'name district'
  )
  res.json(user.toSafeJSON())
})
