import Child from '../models/Child.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/AppError.js'

function calcAge(dob) {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
}

// Drops incomplete GeoJSON (e.g. { type: 'Point' } with no coordinates) so it
// never reaches the 2dsphere index, which cannot index a Point missing coordinates.
function sanitizeLocation(payload) {
  if (payload.location && (!Array.isArray(payload.location.coordinates) || payload.location.coordinates.length !== 2)) {
    delete payload.location
  }
  return payload
}

/** GET /api/children?center=&search=&caregiver= */
export const listChildren = asyncHandler(async (req, res) => {
  const { center, search, caregiver } = req.query
  const filter = { isActive: true }

  // Caregivers only see their assigned center unless they're admin/supervisor
  if (['caregiver', 'field_officer'].includes(req.user.role)) {
    filter.center = req.user.center
  } else if (center) {
    filter.center = center
  }

  if (caregiver) filter.assignedCaregiver = caregiver
  if (search) filter.$text = { $search: search }

  const children = await Child.find(filter).sort({ name: 1 }).limit(500)
  res.json(children)
})

/** GET /api/children/:id */
export const getChild = asyncHandler(async (req, res) => {
  const child = await Child.findById(req.params.id).populate('center', 'name').populate('assignedCaregiver', 'name')
  if (!child) throw new AppError('Child not found', 404)
  res.json(child)
})

/** POST /api/children */
export const createChild = asyncHandler(async (req, res) => {
  const payload = sanitizeLocation({ ...req.body })
  if (payload.dateOfBirth) payload.age = calcAge(payload.dateOfBirth)

  // Caregivers and field officers can only add children into their own center,
  // and are auto-assigned as the caregiver unless one is explicitly provided.
  if (['caregiver', 'field_officer'].includes(req.user.role)) {
    if (!payload.center) payload.center = req.user.center
    if (!payload.assignedCaregiver) payload.assignedCaregiver = req.user._id
  }

  if (!payload.center) {
    throw new AppError('No center is assigned to your account yet. Please contact your administrator.', 422)
  }

  const child = await Child.create(payload)
  res.status(201).json(child)
})

/** PUT /api/children/:id */
export const updateChild = asyncHandler(async (req, res) => {
  const existing = await Child.findById(req.params.id)
  if (!existing) throw new AppError('Child not found', 404)

  // Caregivers/field officers may only edit children within their own center.
  if (
    ['caregiver', 'field_officer'].includes(req.user.role) &&
    String(existing.center) !== String(req.user.center)
  ) {
    throw new AppError('You do not have permission to edit this child record', 403)
  }

  const payload = sanitizeLocation({ ...req.body })
  if (payload.dateOfBirth) payload.age = calcAge(payload.dateOfBirth)
  // Caregivers cannot move a child to a different center via this endpoint.
  if (['caregiver', 'field_officer'].includes(req.user.role)) delete payload.center

  const child = await Child.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
  res.json(child)
})

/** DELETE /api/children/:id — soft delete */
export const deleteChild = asyncHandler(async (req, res) => {
  const existing = await Child.findById(req.params.id)
  if (!existing) throw new AppError('Child not found', 404)

  if (
    ['caregiver', 'field_officer'].includes(req.user.role) &&
    String(existing.center) !== String(req.user.center)
  ) {
    throw new AppError('You do not have permission to remove this child record', 403)
  }

  const child = await Child.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })
  res.json({ message: 'Child record archived' })
})
