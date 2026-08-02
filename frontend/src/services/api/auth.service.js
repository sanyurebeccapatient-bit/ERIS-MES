import { apiClient } from './client'

/**
 * POST /api/auth/login  { phone, pin }
 * @returns {{ user: object, accessToken: string, refreshToken: string }}
 */
export function login(phone, pin) {
  return apiClient.post('/auth/login', { phone, pin })
}

/** POST /api/auth/request-pin-reset  { phone } -> { message } */
export function requestPinReset(phone) {
  return apiClient.post('/auth/request-pin-reset', { phone })
}

/** POST /api/auth/refresh  { refreshToken } -> { accessToken } */
export function refreshAccessToken(refreshToken) {
  return apiClient.post('/auth/refresh', { refreshToken })
}

/** POST /api/auth/logout  { refreshToken } */
export function logout(refreshToken) {
  return apiClient.post('/auth/logout', { refreshToken })
}

/** GET /api/auth/me */
export function getMe() {
  return apiClient.get('/auth/me')
}

/** PATCH /api/auth/me  { name?, phone?, avatarUrl? } -> updated user */
export function updateProfile(payload) {
  return apiClient.patch('/auth/me', payload)
}
