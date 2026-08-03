import { apiClient } from './client'

/** GET /api/admin/users?role=&center=&search=&page=&limit= */
export function listUsers(params = {}) {
  return apiClient.get('/admin/users', params)
}

/** POST /api/admin/users  { name, phone, pin, role, center } */
export function createUser(payload) {
  return apiClient.post('/admin/users', payload)
}

/** PATCH /api/admin/users/:id  { name?, role?, center?, isActive? } */
export function updateUser(id, payload) {
  return apiClient.patch(`/admin/users/${id}`, payload)
}

/** DELETE /api/admin/users/:id */
export function deactivateUser(id) {
  return apiClient.delete(`/admin/users/${id}`)
}

/** DELETE /api/admin/users/:id/remove — permanently removes an already-deactivated user */
export function removeUser(id) {
  return apiClient.delete(`/admin/users/${id}/remove`)
}

/** POST /api/admin/users/:id/reset-pin  { newPin } */
export function resetUserPin(id, payload) {
  return apiClient.post(`/admin/users/${id}/reset-pin`, payload)
}

/** GET /api/admin/pin-reset-requests?status=pending|resolved|cancelled|all */
export function listPinResetRequests(params = {}) {
  return apiClient.get('/admin/pin-reset-requests', params)
}

/** POST /api/admin/pin-reset-requests/:id/resolve  { newPin } */
export function resolvePinResetRequest(id, payload) {
  return apiClient.post(`/admin/pin-reset-requests/${id}/resolve`, payload)
}

/** DELETE /api/admin/pin-reset-requests/:id */
export function cancelPinResetRequest(id) {
  return apiClient.delete(`/admin/pin-reset-requests/${id}`)
}

/** GET /api/admin/centers */
export function listCenters() {
  return apiClient.get('/admin/centers')
}

/** POST /api/admin/centers */
export function createCenter(payload) {
  return apiClient.post('/admin/centers', payload)
}

/** GET /api/admin/centers/:id/children */
export function listCenterChildren(centerId) {
  return apiClient.get(`/admin/centers/${centerId}/children`)
}

/** PATCH /api/admin/centers/:id */
export function updateCenter(id, payload) {
  return apiClient.patch(`/admin/centers/${id}`, payload)
}

/** GET /api/admin/audit-log?action=&page=&limit= */
export function listAuditLog(params = {}) {
  return apiClient.get('/admin/audit-log', params)
}

/** DELETE /api/admin/audit-log — permanently clears the entire audit trail */
export function clearAuditLog() {
  return apiClient.delete('/admin/audit-log')
}

/** GET /api/reports?status= */
export function listReports(params = {}) {
  return apiClient.get('/reports', params)
}

/** PATCH /api/reports/:id/review  { status, reviewNotes } */
export function reviewReport(id, payload) {
  return apiClient.patch(`/reports/${id}/review`, payload)
}

/** GET /api/health-alerts?status=&severity= */
export function listHealthAlerts(params = {}) {
  return apiClient.get('/health-alerts', params)
}

/** PATCH /api/health-alerts/:id  { status?, referredTo?, resolvedAt? } */
export function updateHealthAlert(id, payload) {
  return apiClient.patch(`/health-alerts/${id}`, payload)
}

/** POST /api/health-alerts  { child, severity, title, detail } */
export function createHealthAlert(payload) {
  return apiClient.post('/health-alerts', payload)
}

// ---- Notification management ----

/** GET /api/notifications/admin?userId=&type=&read= */
export function listAllNotifications(params = {}) {
  return apiClient.get('/notifications/admin', params)
}

/** GET /api/notifications/admin/stats */
export function getNotificationStats() {
  return apiClient.get('/notifications/admin/stats')
}

/** POST /api/notifications/admin  { userIds, title, body, type } */
export function sendNotification(payload) {
  return apiClient.post('/notifications/admin', payload)
}

/** DELETE /api/notifications/:id */
export function deleteNotification(id) {
  return apiClient.delete(`/notifications/${id}`)
}
