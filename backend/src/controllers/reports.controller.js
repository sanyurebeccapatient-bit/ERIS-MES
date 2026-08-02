import Report from '../models/Report.js'
import Child from '../models/Child.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/AppError.js'
import { logAudit } from '../utils/audit.js'
import { notifyAdminsOfReport } from '../services/notificationService.js'

/**
 * POST /api/reports
 * Idempotent by clientRecordId — the offline sync queue may retry this
 * after a network blip that actually succeeded server-side.
 */
export const createReport = asyncHandler(async (req, res) => {
  const { reportType, childName, notes, photo, location, clientRecordId } = req.body

  if (clientRecordId) {
    const existing = await Report.findOne({ clientRecordId })
    if (existing) return res.status(200).json(existing)
  }

  if (!reportType) throw new AppError('reportType is required', 400)

  // Best-effort match to an existing child record by name within the user's center
  let matchedChild = null
  if (childName) {
    matchedChild = await Child.findOne({
      name: new RegExp(`^${childName.trim()}$`, 'i'),
      center: req.user.center,
    })
  }

  const report = await Report.create({
    reportType,
    child: matchedChild?._id || null,
    childNameFreeText: matchedChild ? '' : childName,
    submittedBy: req.user._id,
    center: req.user.center,
    notes,
    photoUrls: photo ? [photo] : [],
    location,
    clientRecordId,
    status: 'submitted',
  })

  // Fire-and-forget: let admins/supervisors know a new report needs review.
  // Never let a notification failure block the caregiver's submission.
  notifyAdminsOfReport(report).catch((err) => {
    console.error('[notify] failed to notify admins of new report:', err.message)
  })

  res.status(201).json(report)
})

/** GET /api/reports?status=&reportType=&search= — caregiver's own reports, or admin review queue */
export const listReports = asyncHandler(async (req, res) => {
  const filter = {}
  if (req.query.status) filter.status = req.query.status
  if (req.query.reportType) filter.reportType = req.query.reportType

  // Text search across notes and childNameFreeText
  if (req.query.search) {
    const q = req.query.search.trim()
    filter.$or = [
      { notes: { $regex: q, $options: 'i' } },
      { childNameFreeText: { $regex: q, $options: 'i' } },
    ]
  }

  if (['caregiver', 'field_officer'].includes(req.user.role)) {
    filter.submittedBy = req.user._id
  }

  const reports = await Report.find(filter)
    .populate('submittedBy', 'name role')
    .populate('child', 'name')
    .populate('center', 'name')
    .sort({ createdAt: -1 })
    .limit(200)

  res.json(reports)
})

/** PATCH /api/reports/:id/review — admin approve/reject */
export const reviewReport = asyncHandler(async (req, res) => {
  const { status, reviewNotes } = req.body
  if (!['approved', 'rejected', 'under_review'].includes(status)) {
    throw new AppError('status must be approved, rejected, or under_review', 400)
  }

  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { status, reviewNotes, reviewedBy: req.user._id },
    { new: true }
  )
  if (!report) throw new AppError('Report not found', 404)

  await logAudit({
    actor: req.user._id,
    action: `report.${status}`,
    entity: { kind: 'Report', id: report._id },
    ipAddress: req.ip,
  })

  res.json(report)
})
