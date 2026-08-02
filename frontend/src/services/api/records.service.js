import { apiClient } from './client'

/** GET /api/attendance/today -> Array<AttendanceRecord & { child }> */
export function getTodayAttendance() {
  return apiClient.get('/attendance/today')
}

/** GET /api/visits -> Array<Visit & { child }> */
export function listVisits() {
  return apiClient.get('/visits')
}

/** GET /api/visits/upcoming -> Array<Visit & { child }> */
export function getUpcomingVisits() {
  return apiClient.get('/visits/upcoming')
}

/** POST /api/visits  { childId, type, scheduledFor, address?, notes? } */
export function createVisit(payload) {
  return apiClient.post('/visits', payload)
}

/** PATCH /api/visits/:id  { status?, notes?, outcome?, ... } */
export function updateVisit(id, payload) {
  return apiClient.patch(`/visits/${id}`, payload)
}

/** GET /api/health-alerts -> Array<HealthAlert & { child }> */
export function getHealthAlerts() {
  return apiClient.get('/health-alerts')
}

/** GET /api/meals/today -> Array<MealRecord & { child }> */
export function getTodayMeals() {
  return apiClient.get('/meals/today')
}

/** GET /api/notifications -> Array<Notification> */
export function getNotifications() {
  return apiClient.get('/notifications')
}

/** PATCH /api/notifications/:id/read -> Notification */
export function markNotificationRead(id) {
  return apiClient.patch(`/notifications/${id}/read`)
}

/** DELETE /api/notifications -> clears all admin-originated alerts for the current user */
export function clearNotifications() {
  return apiClient.delete('/notifications')
}

/** GET /api/emergency-contacts -> Array<Contact> */
export function getEmergencyContacts() {
  return apiClient.get('/emergency-contacts')
}

/** GET /api/reports?reportType= -> Array<Report> — caregiver's own submitted reports */
export function listMyReports(params = {}) {
  return apiClient.get('/reports', params)
}
