import { apiClient } from './client'

/**
 * GET /api/dashboard/caregiver
 * @returns {{
 *   childrenAssigned: number,
 *   attendanceToday: { present: number, absent: number, late: number, total: number },
 *   pendingVisits: number,
 *   healthAlerts: number,
 *   mealsRecordedToday: number
 * }}
 */
export function getCaregiverDashboard() {
  return apiClient.get('/dashboard/caregiver')
}

/**
 * GET /api/dashboard/admin
 * @returns {{
 *   totalChildren: number, totalCaregivers: number, totalCenters: number,
 *   todayAttendanceRate: number, pendingReports: number, activeAlerts: number,
 *   attendanceTrend: number[], attendanceTrendLabels: string[]
 * }}
 */
export function getAdminDashboard(params = {}) {
  return apiClient.get('/dashboard/admin', params)
}
