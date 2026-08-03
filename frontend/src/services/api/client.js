/**
 * API Client
 * -----------------------------------------------------------------------
 * This is the ONLY file that should know whether we're talking to a mock
 * data layer or a real Node/Express backend. Every service module
 * (children.service.js, visits.service.js, etc.) calls `apiClient.get/post/...`
 * and never touches axios or mock data directly.
 *
 * TO CONNECT A REAL BACKEND LATER:
 *   1. Set USE_MOCK_API to false in src/constants/index.js
 *   2. Set VITE_API_BASE_URL in a .env file (e.g. https://eris-mes.onrender.com/api)
 *   3. Implement matching Express routes returning the same shapes
 *      documented in each service file's JSDoc.
 * No component or store code needs to change.
 * -----------------------------------------------------------------------
 */
import axios from 'axios'
import { USE_MOCK_API } from '@/constants'
import { mockRequest } from './mockAdapter'
import { dedupRequest } from '@/utils/requestDedup.js'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

const http = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach auth token automatically once real auth exists
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('ecd_auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Shared across all requests: when several calls fail with 401 at once
// (e.g. a dashboard firing off ten parallel GETs right as the access token
// expires), they all await this ONE in-flight refresh instead of each
// firing its own POST /auth/refresh. Without this, N concurrent requests
// caused N concurrent refresh calls — wasteful, and easy to misread in
// logs as the session randomly failing to refresh.
let refreshInFlight = null

function refreshAccessTokenOnce() {
  if (!refreshInFlight) {
    const refreshToken = localStorage.getItem('ecd_refresh_token')
    if (!refreshToken) return Promise.reject(new Error('No refresh token'))
    refreshInFlight = axios
      .post(`${baseURL}/auth/refresh`, { refreshToken })
      .then(({ data }) => {
        localStorage.setItem('ecd_auth_token', data.accessToken)
        return data.accessToken
      })
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config

    // Attempt exactly one silent refresh on a 401, then retry the original request.
    if (err.response?.status === 401 && !original._retried && !original.url?.includes('/auth/')) {
      original._retried = true
      try {
        const accessToken = await refreshAccessTokenOnce()
        original.headers.Authorization = `Bearer ${accessToken}`
        return http.request(original)
      } catch {
        localStorage.removeItem('ecd_auth_token')
        localStorage.removeItem('ecd_refresh_token')
      }
    }

    // Centralized error normalization — short, user-friendly messages
    const isTimeout = err.code === 'ECONNABORTED' || (err.message || '').includes('timeout')
    const isOffline = !err.response && !isTimeout

    // Short error messages — never show raw tech text
    let friendlyMsg
    if (isTimeout) {
      friendlyMsg = 'No connection. Check internet and retry.'
    } else if (isOffline) {
      friendlyMsg = 'You are offline. Check internet and retry.'
    } else if (err.response?.status === 429) {
      friendlyMsg = 'Too many requests. Try again shortly.'
    } else if (err.response?.status >= 500) {
      friendlyMsg = 'Server error. Please retry.'
    } else if (err.response?.status === 403) {
      friendlyMsg = 'Access denied.'
    } else if (err.response?.status === 404) {
      friendlyMsg = 'Not found.'
    } else {
      const details = err.response?.data?.details
      const detailMsg = Array.isArray(details) && details.length
        ? details.map((d) => d.message).filter(Boolean).join(', ')
        : ''
      friendlyMsg = detailMsg || err.response?.data?.message || 'Something went wrong. Tap to retry.'
    }

    const normalized = {
      status: err.response?.status ?? 0,
      message: friendlyMsg,
      isOffline,
      isTimeout,
    }
    return Promise.reject(normalized)
  }
)

function dedupKey(method, url, params) {
  const qs = params ? JSON.stringify(params) : ''
  return `${method}:${url}?${qs}`
}

async function request(method, url, { data, params } = {}) {
  const key = dedupKey(method, url, params)
  if (USE_MOCK_API) {
    return dedupRequest(key, () => mockRequest(method, url, { data, params }))
  }
  const res = await dedupRequest(key, () => http.request({ method, url, data, params }))
  return normalizeIds(res.data)
}

/**
 * Recursively mirrors MongoDB's `_id` onto a plain `id` field (and does the
 * same for populated ref sub-objects) so components can always read `.id`
 * regardless of whether they're talking to the mock API or the real one.
 * No-op for anything that already has a plain `id` (i.e. mock data).
 */
function normalizeIds(value) {
  if (Array.isArray(value)) return value.map(normalizeIds)
  if (value && typeof value === 'object') {
    const out = { ...value }
    if (out._id && !out.id) out.id = out._id
    for (const key of Object.keys(out)) {
      if (out[key] && typeof out[key] === 'object') {
        out[key] = normalizeIds(out[key])
      }
    }
    return out
  }
  return value
}

export const apiClient = {
  get: (url, params) => request('get', url, { params }),
  post: (url, data) => request('post', url, { data }),
  put: (url, data) => request('put', url, { data }),
  patch: (url, data) => request('patch', url, { data }),
  delete: (url) => request('delete', url),
  /** Raw POST for multipart/form-data (no JSON stringify, no normalizeIds) */
  _rawPost(url, data) {
    return dedupRequest(`post:${url}`, () => http.post(url, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).then(res => res.data)
  },
}
