/**
 * Resolves a possibly-relative media path (e.g. '/uploads/avatars/abc.jpg')
 * returned by the backend into an absolute URL pointing at the API's origin,
 * so images render correctly regardless of which origin the frontend is
 * served from (Vite dev server, Capacitor webview, etc).
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

// Strip a trailing '/api' (or '/api/') to get the backend's origin.
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '')

export function resolveMediaUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }
  if (!API_ORIGIN) return url
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`
}
