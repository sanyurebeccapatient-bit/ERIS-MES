import { apiClient } from './client'

/** GET /api/children -> Array<Child> */
export function listChildren() {
  return apiClient.get('/children')
}

/** GET /api/children/:id -> Child */
export function getChild(id) {
  return apiClient.get(`/children/${id}`)
}

/** POST /api/children  { name, dateOfBirth?, gender, guardian: { name, relationship?, phone? }, center, healthFlag? } */
export function createChild(payload) {
  return apiClient.post('/children', payload)
}

/** PUT /api/children/:id */
export function updateChild(id, payload) {
  return apiClient.put(`/children/${id}`, payload)
}

/** DELETE /api/children/:id — archives (soft delete) */
export function deleteChild(id) {
  return apiClient.delete(`/children/${id}`)
}
