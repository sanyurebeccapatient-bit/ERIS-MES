import Attendance from '../models/Attendance.js'
import Child from '../models/Child.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/AppError.js'
import { emitToAdmins } from '../services/socket.js'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

/** GET /api/attendance/today */
export const getTodayAttendance = asyncHandler(async (req, res) => {
  const date = req.query.date || todayStr()
  const filter = { date }

  if (['caregiver', 'field_officer'].includes(req.user.role)) {
    const children = await Child.find({ center: req.user.center, isActive: true }).select('_id')
    filter.child = { $in: children.map((c) => c._id) }
  }

  const records = await Attendance.find(filter).populate({
    path: 'child',
    select: 'name age guardian center photoUrl',
    populate: { path: 'center', select: 'name' },
  })
  res.json(records)
})

/**
 * POST /api/attendance
 * Idempotent by design: if clientRecordId is provided and already exists,
 * returns the existing record instead of erroring — critical for the
 * offline sync queue, where a flush can be retried after a partial failure.
 */
export const recordAttendance = asyncHandler(async (req, res) => {
  const { childId, status, time, location, clientRecordId } = req.body
  if (!childId || !status) throw new AppError('childId and status are required', 400)

  if (clientRecordId) {
    const existing = await Attendance.findOne({ clientRecordId })
    if (existing) return res.status(200).json(existing)
  }

  const child = await Child.findById(childId)
  if (!child) throw new AppError('Child not found', 404)

  const date = todayStr()
  const record = await Attendance.findOneAndUpdate(
    { child: childId, date },
    {
      child: childId,
      center: child.center,
      recordedBy: req.user._id,
      date,
      status,
      checkInTime: time || null,
      location,
      clientRecordId,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  res.status(201).json(record)

  // Fire-and-forget: let admin dashboards update live without polling
  emitToAdmins('attendance:recorded', {
    childId: record.child,
    status: record.status,
    date: record.date,
  })
})
