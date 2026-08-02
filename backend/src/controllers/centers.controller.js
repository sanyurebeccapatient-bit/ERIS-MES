import Center from '../models/Center.js'
import Child from '../models/Child.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/AppError.js'
import { logAudit } from '../utils/audit.js'

/** GET /api/centers */
export const listCenters = asyncHandler(async (req, res) => {
  const centers = await Center.find({ isActive: true }).populate('manager', 'name phone').sort({ name: 1 })

  // Real enrollment count: number of active children currently assigned to
  // each center, rather than a static/placeholder figure.
  const counts = await Child.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$center', count: { $sum: 1 } } },
  ])
  const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]))

  const withEnrollment = centers.map((center) => {
    const obj = center.toObject()
    obj.enrolled = countMap[center._id.toString()] || 0
    return obj
  })

  res.json(withEnrollment)
})

/** POST /api/centers */
export const createCenter = asyncHandler(async (req, res) => {
  const center = await Center.create(req.body)
  await logAudit({ actor: req.user._id, action: 'center.create', entity: { kind: 'Center', id: center._id }, metadata: { name: center.name }, ipAddress: req.ip })
  res.status(201).json(center)
})

/** PATCH /api/centers/:id */
export const updateCenter = asyncHandler(async (req, res) => {
  const center = await Center.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  if (!center) throw new AppError('Center not found', 404)
  res.json(center)
})
