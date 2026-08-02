import Visit from '../models/Visit.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/AppError.js'

/** GET /api/visits?status= */
export const listVisits = asyncHandler(async (req, res) => {
  const filter = {}
  if (['caregiver', 'field_officer'].includes(req.user.role)) {
    filter.assignedTo = req.user._id
  }
  if (req.query.status) filter.status = req.query.status

  const visits = await Visit.find(filter).populate('child', 'name age guardian photoUrl').sort({ scheduledFor: 1 })
  res.json(visits)
})

/** GET /api/visits/upcoming */
export const getUpcomingVisits = asyncHandler(async (req, res) => {
  const filter = { status: 'scheduled' }
  if (['caregiver', 'field_officer'].includes(req.user.role)) {
    filter.assignedTo = req.user._id
  }
  const visits = await Visit.find(filter).populate('child', 'name age guardian photoUrl').sort({ scheduledFor: 1 }).limit(20)
  res.json(visits)
})

/** POST /api/visits  — accepts `childId` (or `child`) from the client, maps onto the `child` ref */
export const createVisit = asyncHandler(async (req, res) => {
  const { childId, child, ...rest } = req.body
  const childRef = child || childId
  if (!childRef) throw new AppError('childId is required', 400)

  const visit = await Visit.create({
    ...rest,
    child: childRef,
    assignedTo: req.body.assignedTo || req.user._id,
  })
  await visit.populate('child', 'name age guardian photoUrl')
  res.status(201).json(visit)
})

/** PATCH /api/visits/:id — update status, notes, outcome, location, photos */
export const updateVisit = asyncHandler(async (req, res) => {
  const updates = { ...req.body }
  delete updates.childId // child ref should not be reassigned via this endpoint
  delete updates.child
  if (updates.status === 'completed' && !updates.completedAt) {
    updates.completedAt = new Date()
  }
  const visit = await Visit.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).populate(
    'child',
    'name age guardian photoUrl'
  )
  if (!visit) throw new AppError('Visit not found', 404)
  res.json(visit)
})
