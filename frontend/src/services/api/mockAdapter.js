/**
 * Mock Adapter
 * -----------------------------------------------------------------------
 * Simulates a REST API against src/services/api/mockData.js so the whole
 * frontend can be built, demoed, and QA'd before the backend exists.
 * Routes here should mirror what real Express routes will look like.
 * -----------------------------------------------------------------------
 */
import * as db from './mockData'

const LATENCY_MS = 350

function delay(ms = LATENCY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function notFound(resource) {
  const err = { status: 404, message: `${resource} not found`, isOffline: false }
  return Promise.reject(err)
}

// Very small router: matches `method url` against a table of handlers.
// Supports `:id` params.
function matchRoute(method, url) {
  const routes = db.routeTable
  const urlParts = url.split('?')[0].split('/').filter(Boolean)

  for (const route of routes) {
    if (route.method !== method) continue
    const routeParts = route.path.split('/').filter(Boolean)
    if (routeParts.length !== urlParts.length) continue

    const params = {}
    let matched = true
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        params[routeParts[i].slice(1)] = urlParts[i]
      } else if (routeParts[i] !== urlParts[i]) {
        matched = false
        break
      }
    }
    if (matched) return { handler: route.handler, params }
  }
  return null
}

export async function mockRequest(method, url, { data, params } = {}) {
  await delay()
  const match = matchRoute(method, url)
  if (!match) return notFound(url)
  try {
    return match.handler({ params: match.params, query: params, body: data })
  } catch (e) {
    // Handlers may throw either a plain { status, message } error object
    // (preferred, mirrors the real API's error shape) or a native Error.
    if (e && typeof e === 'object' && 'status' in e) {
      return Promise.reject(e)
    }
    return Promise.reject({ status: 500, message: e?.message || 'Unexpected error', isOffline: false })
  }
}
