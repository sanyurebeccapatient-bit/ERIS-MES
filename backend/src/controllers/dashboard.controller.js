import Child from '../models/Child.js'
import Attendance from '../models/Attendance.js'
import Visit from '../models/Visit.js'
import HealthAlert from '../models/HealthAlert.js'
import Meal from '../models/Meal.js'
import User from '../models/User.js'
import Center from '../models/Center.js'
import Report from '../models/Report.js'
import { asyncHandler } from '../utils/asyncHandler.js'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

/** GET /api/dashboard/caregiver */
export const getCaregiverDashboard = asyncHandler(async (req, res) => {
  const date = todayStr()
  const childFilter = { center: req.user.center, isActive: true }
  const children = await Child.find(childFilter).select('_id')
  const childIds = children.map((c) => c._id)

  const [attendanceRecords, pendingVisits, healthAlerts, mealsToday] = await Promise.all([
    Attendance.find({ child: { $in: childIds }, date }),
    Visit.countDocuments({ assignedTo: req.user._id, status: 'scheduled' }),
    HealthAlert.countDocuments({ child: { $in: childIds }, status: { $ne: 'resolved' } }),
    Meal.countDocuments({ child: { $in: childIds }, date, recorded: true }),
  ])

  res.json({
    childrenAssigned: children.length,
    attendanceToday: {
      present: attendanceRecords.filter((a) => a.status === 'present').length,
      absent: attendanceRecords.filter((a) => a.status === 'absent').length,
      late: attendanceRecords.filter((a) => a.status === 'late').length,
      total: children.length,
    },
    pendingVisits,
    healthAlerts,
    mealsRecordedToday: mealsToday,
  })
})

/** GET /api/dashboard/admin */
export const getAdminDashboard = asyncHandler(async (req, res) => {
  const today = todayStr()

  // Determine trend range from query param
  const range = req.query.range || '7d'
  let trendDaysCount = 7
  if (range === '30d') trendDaysCount = 30
  else if (range === 'quarter') trendDaysCount = 90
  else if (range === '1y') trendDaysCount = 365

  const [totalChildren, totalCaregivers, totalCenters, todayAttendance, pendingReports, activeAlerts] =
    await Promise.all([
      Child.countDocuments({ isActive: true }),
      User.countDocuments({ role: { $in: ['caregiver', 'field_officer'] }, isActive: true }),
      Center.countDocuments({ isActive: true }),
      Attendance.find({ date: today }),
      Report.countDocuments({ status: 'submitted' }),
      HealthAlert.countDocuments({ status: { $ne: 'resolved' } }),
    ])

  const presentToday = todayAttendance.filter((a) => a.status === 'present').length
  const todayAttendanceRate = todayAttendance.length
    ? Math.round((presentToday / todayAttendance.length) * 100)
    : 0

  // Attendance trend over the selected range
  const trendDays = []
  for (let i = trendDaysCount - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    trendDays.push(d.toISOString().slice(0, 10))
  }
  const trendCounts = await Attendance.aggregate([
    { $match: { date: { $in: trendDays } } },
    {
      $group: {
        _id: '$date',
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
      },
    },
  ])
  const trendMap = Object.fromEntries(trendCounts.map((t) => [t._id, t]))
  const attendanceTrend = trendDays.map((d) => {
    const t = trendMap[d]
    return t && t.total ? Math.round((t.present / t.total) * 100) : 0
  })
  const attendanceTrendLabels = trendDays.map((d) => {
    const date = new Date(d)
    // For ranges > 30 days, show abbreviated month-day; otherwise weekday
    if (trendDaysCount > 30) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  })

  res.json({
    totalChildren,
    totalCaregivers,
    totalCenters,
    todayAttendanceRate,
    pendingReports,
    activeAlerts,
    attendanceTrend,
    attendanceTrendLabels,
  })
})
