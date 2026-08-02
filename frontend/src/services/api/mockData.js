/**
 * Mock Data Store
 * -----------------------------------------------------------------------
 * In-memory data + a route table the mockAdapter dispatches against.
 * All data is persisted to localStorage so it survives page refreshes.
 * Starts with EMPTY data — no template/seed records.
 * -----------------------------------------------------------------------
 */

const STORAGE_KEY = 'ecd_mock_db'

// ---------- Persistent storage helpers ----------
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* corrupted – start fresh */ }
  return null
}

function saveToStorage() {
  const snapshot = {
    users,
    centers,
    children,
    attendanceToday,
    visits,
    healthAlerts,
    mealsToday,
    notifications,
    emergencyContacts,
    reports,
    auditLog,
    pinResetRequests,
    adminStats,
    currentUserId: session.user?.id ?? null,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
}

// ---------- Users (start with one default caregiver + one admin for login) ----------
// pin is mock-only plaintext (never done this way against a real backend —
// the real Express API hashes PINs with bcrypt, see backend/src/models/User.js)
const defaultUsers = [
  {
    id: 'u1',
    name: 'Grace Uwimana',
    role: 'caregiver',
    avatar: null,
    center: 'Kicukiro ECD Center',
    centerId: 'ctr1',
    phone: '+250 788 123 456',
    pin: '1234',
    isActive: true,
    createdAt: '2026-02-14T08:00:00',
  },
  {
    id: 'u2',
    name: 'Alice Karenzi',
    role: 'admin',
    avatar: null,
    center: 'Kicukiro ECD Center',
    centerId: 'ctr1',
    phone: '+250 788 999 000',
    pin: '1234',
    isActive: true,
    createdAt: '2026-01-10T08:00:00',
  },
]

const defaultCenters = [
  { id: 'ctr1', name: 'Kicukiro ECD Center', code: 'KIC-001', district: 'Kicukiro', sector: 'Gatenga', capacity: 60, enrolled: 0, manager: 'Alice Karenzi', isActive: true },
]

const defaultEmergencyContacts = [
  { id: 'e1', name: 'District Health Office', phone: '+250 788 000 111', type: 'health' },
  { id: 'e2', name: 'Center Supervisor — Alice K.', phone: '+250 788 222 333', type: 'supervisor' },
  { id: 'e3', name: 'National ECD Hotline', phone: '114', type: 'hotline' },
]

// Try to load persisted data; if none exists, start with defaults
const saved = loadFromStorage()

export const users = saved ? saved.users : [...defaultUsers]
export const centers = saved ? saved.centers : [...defaultCenters]
export const children = saved ? saved.children : []
export const attendanceToday = saved ? saved.attendanceToday : []
export const visits = saved ? saved.visits : []
export const healthAlerts = saved ? saved.healthAlerts : []
export const mealsToday = saved ? saved.mealsToday : []
export const notifications = saved ? saved.notifications : []
export const emergencyContacts = saved ? saved.emergencyContacts : [...defaultEmergencyContacts]
export const reports = saved ? saved.reports : []
export const auditLog = saved ? saved.auditLog : []
export const pinResetRequests = saved ? saved.pinResetRequests : []
export const adminStats = saved ? saved.adminStats : {
  totalChildren: 0,
  totalCaregivers: 0,
  totalCenters: 1,
  todayAttendanceRate: 0,
  pendingReports: 0,
  activeAlerts: 0,
  attendanceTrend: [0, 0, 0, 0, 0, 0, 0],
  attendanceTrendLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}

// `session.user` is the single source of truth for "who is logged in" in the
// mock layer. It's a plain mutable object (not a const binding) so /auth/login
// can actually switch identity between accounts — this is what gives each
// caregiver their own isolated view of children/attendance/notifications/etc.
const restoredUserId = saved ? saved.currentUserId : null
export const session = {
  user: (restoredUserId && users.find((u) => u.id === restoredUserId)) || users[0] || null,
}

/** Convenience accessor used throughout the route handlers below. */
function getCurrentUser() {
  return session.user
}

// Backwards-compatible read-only reference for any external code that may
// still import `currentUser` directly — always reflects the live session.
export const currentUser = new Proxy(
  {},
  {
    get(_target, prop) {
      return session.user ? session.user[prop] : undefined
    },
  }
)

// ---------- Helper: derive child object ----------
function withChild(record) {
  return { ...record, child: children.find((c) => c.id === record.childId) || null }
}

// ---------- Helper: scope children to the logged-in caregiver ----------
// Admins/supervisors/center managers see every child; caregivers and field
// officers only ever see children assigned to them. Legacy records without a
// caregiverId (created before this fix) are treated as unassigned and are
// only visible to admin roles, not to arbitrary caregivers.
function childrenForCurrentUser() {
  const user = getCurrentUser()
  if (!user) return []
  if (['admin', 'supervisor', 'center_manager'].includes(user.role)) return children
  return children.filter((c) => c.caregiverId === user.id)
}

// ---------- Helper: save state after any mutation ----------
function persist() {
  // Update session.user reference in case the logged-in user's profile was edited
  if (users.length > 0 && session.user) {
    const idx = users.findIndex((u) => u.id === session.user.id)
    if (idx !== -1) Object.assign(session.user, users[idx])
  }
  saveToStorage()
}

// ---------- Helper: generate health alerts from children with healthFlag ----------
function deriveHealthAlertsFromChildren() {
  // Remove alerts that were auto-derived and no longer valid
  const autoAlerts = healthAlerts.filter(a => a.autoDerived)
  autoAlerts.forEach(a => {
    const idx = healthAlerts.indexOf(a)
    if (idx !== -1) healthAlerts.splice(idx, 1)
  })
  // Add alerts for children with healthFlag
  children.forEach(child => {
    if (child.healthFlag) {
      const exists = healthAlerts.find(a => a.childId === child.id && a.autoDerived)
      if (!exists) {
        const severityLabels = { low: 'Low', medium: 'Medium — follow-up', high: 'High — urgent', critical: 'Critical' }
        healthAlerts.push({
          id: `h_${child.id}`,
          childId: child.id,
          severity: child.healthFlag,
          title: severityLabels[child.healthFlag] || 'Health flag set',
          detail: `Health concern flagged for ${child.name}`,
          createdAt: new Date().toISOString(),
          autoDerived: true,
        })
      }
    }
  })
}

// -----------------------------------------------------------------------
// Route table
// -----------------------------------------------------------------------
// Normalizes phone numbers for comparison (strips spaces/dashes) so
// '+250 788 123 456' and '+250788123456' are treated as the same account.
function normalizePhone(phone) {
  return String(phone || '').replace(/[\s-]/g, '')
}

export const routeTable = [
  { method: 'post', path: '/auth/login', handler: ({ body }) => {
    if (!body?.phone || !body?.pin) {
      const err = { status: 400, message: 'Phone and PIN are required', isOffline: false }
      throw err
    }
    const match = users.find(
      (u) => normalizePhone(u.phone) === normalizePhone(body.phone) && u.pin === String(body.pin)
    )
    if (!match) {
      throw { status: 401, message: 'Invalid phone number or PIN', isOffline: false }
    }
    if (!match.isActive) {
      throw { status: 403, message: 'This account has been deactivated', isOffline: false }
    }
    session.user = match
    persist()
    return {
      user: match,
      accessToken: `mock-access-token:${match.id}`,
      refreshToken: `mock-refresh-token:${match.id}`,
    }
  }},
  { method: 'post', path: '/auth/refresh', handler: () => ({ accessToken: `mock-access-token:${session.user?.id || ''}` }) },
  { method: 'post', path: '/auth/logout', handler: () => {
    session.user = null
    persist()
    return { message: 'Logged out' }
  }},
  { method: 'get', path: '/auth/me', handler: () => {
    if (!session.user) throw { status: 401, message: 'Not authenticated', isOffline: false }
    return session.user
  }},
  { method: 'patch', path: '/auth/me', handler: ({ body }) => {
    const user = getCurrentUser()
    if (!user) throw { status: 401, message: 'Not authenticated', isOffline: false }
    if (body.name !== undefined) {
      user.name = body.name
      const u = users.find(u2 => u2.id === user.id)
      if (u) u.name = body.name
    }
    if (body.phone !== undefined) {
      user.phone = body.phone
      const u = users.find(u2 => u2.id === user.id)
      if (u) u.phone = body.phone
    }
    if (body.avatar !== undefined) {
      user.avatar = body.avatar
      const u = users.find(u2 => u2.id === user.id)
      if (u) u.avatar = body.avatar
    }
    persist()
    return user
  }},

  // ---------- Dashboard (caregiver) — computed dynamically, scoped to the
  // logged-in caregiver's own assigned children ----------
  { method: 'get', path: '/dashboard/caregiver', handler: () => {
    deriveHealthAlertsFromChildren()
    const myChildren = childrenForCurrentUser()
    const myChildIds = new Set(myChildren.map((c) => c.id))
    const myAttendance = attendanceToday.filter((a) => myChildIds.has(a.childId))
    const present = myAttendance.filter((a) => a.status === 'present').length
    const absent = myAttendance.filter((a) => a.status === 'absent').length
    const late = myAttendance.filter((a) => a.status === 'late').length
    return {
      childrenAssigned: myChildren.length,
      attendanceToday: {
        present,
        absent,
        late,
        total: myChildren.length,
      },
      pendingVisits: visits.filter((v) => myChildIds.has(v.childId) && v.status === 'scheduled').length,
      healthAlerts: healthAlerts.filter((a) => myChildIds.has(a.childId)).length,
      mealsRecordedToday: mealsToday.filter((m) => myChildIds.has(m.childId) && m.recorded).length,
    }
  }},

  // ---------- Dashboard (admin) — computed dynamically, sees everything ----------
  { method: 'get', path: '/dashboard/admin', handler: ({ query }) => {
    const range = query?.range || '7d'
    let trendDaysCount = 7
    if (range === '30d') trendDaysCount = 30
    else if (range === 'quarter') trendDaysCount = 90
    else if (range === '1y') trendDaysCount = 365
    const present = attendanceToday.filter((a) => a.status === 'present').length
    const totalAtt = attendanceToday.length
    adminStats.totalChildren = children.length
    adminStats.totalCaregivers = users.filter(u => u.role === 'caregiver').length
    adminStats.totalCenters = centers.length
    adminStats.activeAlerts = healthAlerts.length
    adminStats.pendingReports = reports.filter(r => r.status === 'submitted' || r.status === 'under_review').length
    adminStats.todayAttendanceRate = totalAtt > 0 ? Math.round((present / totalAtt) * 100) : 0
    // Generate trend labels for the selected range
    const trendLabels = []
    const trendData = []
    for (let i = trendDaysCount - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      if (trendDaysCount > 30) {
        trendLabels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      } else {
        trendLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }))
      }
      trendData.push(0)
    }
    adminStats.attendanceTrend = trendData
    adminStats.attendanceTrendLabels = trendLabels
    return adminStats
  }},

  { method: 'get', path: '/children', handler: () => childrenForCurrentUser() },
  { method: 'get', path: '/children/:id', handler: ({ params }) =>
    children.find((c) => c.id === params.id) || null
  },
  { method: 'post', path: '/children', handler: ({ body }) => {
    if (!body?.name) {
      throw { status: 400, message: 'Name is required', isOffline: false }
    }
    const user = getCurrentUser()
    const guardianName = typeof body.guardian === 'object' ? body.guardian?.name : body.guardian
    const child = {
      id: `c${Date.now()}`,
      name: body.name,
      age: body.age ?? null,
      gender: body.gender || 'other',
      guardian: guardianName || '',
      guardianPhone: typeof body.guardian === 'object' ? body.guardian?.phone : body.guardianPhone || '',
      center: body.center || user?.center || '',
      // New children are auto-assigned to whichever caregiver created them,
      // so their own dashboard/attendance/visits stay scoped correctly.
      // Admins can create unassigned records by passing caregiverId explicitly.
      caregiverId: body.caregiverId ?? (user?.role === 'caregiver' ? user.id : null),
      photo: body.photo || null,
      healthFlag: body.healthFlag || null,
    }
    children.push(child)
    // Auto-derive health alert if healthFlag is set
    deriveHealthAlertsFromChildren()
    persist()
    return child
  }},
  { method: 'put', path: '/children/:id', handler: ({ params, body }) => {
    const child = children.find((c) => c.id === params.id)
    if (!child) throw { status: 404, message: 'Child not found', isOffline: false }
    const guardianName = typeof body.guardian === 'object' ? body.guardian?.name : body.guardian
    Object.assign(child, {
      name: body.name ?? child.name,
      age: body.age ?? child.age,
      gender: body.gender ?? child.gender,
      guardian: guardianName ?? child.guardian,
      guardianPhone: (typeof body.guardian === 'object' ? body.guardian?.phone : body.guardianPhone) ?? child.guardianPhone,
      healthFlag: body.healthFlag !== undefined ? body.healthFlag : child.healthFlag,
      photo: body.photo !== undefined ? body.photo : child.photo,
    })
    // Re-derive health alerts in case healthFlag changed
    deriveHealthAlertsFromChildren()
    persist()
    return child
  }},
  { method: 'delete', path: '/children/:id', handler: ({ params }) => {
    const idx = children.findIndex((c) => c.id === params.id)
    if (idx === -1) throw { status: 404, message: 'Child not found', isOffline: false }
    children.splice(idx, 1)
    // Remove related records
    const childId = params.id
    for (let i = attendanceToday.length - 1; i >= 0; i--) {
      if (attendanceToday[i].childId === childId) attendanceToday.splice(i, 1)
    }
    for (let i = visits.length - 1; i >= 0; i--) {
      if (visits[i].childId === childId) visits.splice(i, 1)
    }
    for (let i = healthAlerts.length - 1; i >= 0; i--) {
      if (healthAlerts[i].childId === childId) healthAlerts.splice(i, 1)
    }
    for (let i = mealsToday.length - 1; i >= 0; i--) {
      if (mealsToday[i].childId === childId) mealsToday.splice(i, 1)
    }
    persist()
    return { message: 'Child record archived' }
  }},

  { method: 'get', path: '/attendance/today', handler: () => {
    const myIds = new Set(childrenForCurrentUser().map((c) => c.id))
    return attendanceToday.filter((a) => myIds.has(a.childId)).map(withChild)
  }},
  { method: 'post', path: '/attendance', handler: ({ body }) => {
    if (!body?.childId) throw { status: 400, message: 'childId is required', isOffline: false }
    // Upsert: remove existing record for this child today, then add new one
    const existingIdx = attendanceToday.findIndex((a) => a.childId === body.childId)
    if (existingIdx !== -1) attendanceToday.splice(existingIdx, 1)
    const record = {
      id: `a${Date.now()}_${body.childId}`,
      childId: body.childId,
      status: body.status || 'present',
      time: body.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      date: body.date || new Date().toISOString().slice(0, 10),
    }
    attendanceToday.push(record)
    // Add notification about attendance (internal/system entry — never shown
    // in the caregiver alerts UI, which only surfaces admin-originated alerts).
    // Guard against duplicate entries for the same child+status.
    const child = children.find((c) => c.id === body.childId)
    const actingUser = getCurrentUser()
    if (child) {
      const dupe = notifications.find(
        (n) => n.type === 'sync' && n.relatedChildId === child.id && n.body === `${child.name} marked as ${body.status}`
      )
      if (!dupe) {
        notifications.unshift({
          id: `n${Date.now()}`,
          title: 'Attendance recorded',
          body: `${child.name} marked as ${body.status}`,
          time: 'Just now',
          read: false,
          type: 'sync',
          relatedChildId: child.id,
          userId: actingUser?.id ?? null,
        })
      }
    }
    persist()
    return withChild(record)
  }},

  { method: 'get', path: '/visits', handler: () => {
    const myIds = new Set(childrenForCurrentUser().map((c) => c.id))
    return visits.filter((v) => myIds.has(v.childId)).map(withChild)
  }},
  { method: 'get', path: '/visits/upcoming', handler: () => {
    const myIds = new Set(childrenForCurrentUser().map((c) => c.id))
    return visits.filter((v) => myIds.has(v.childId) && v.status === 'scheduled').map(withChild)
  }},
  { method: 'post', path: '/visits', handler: ({ body }) => {
    if (!body?.childId) throw { status: 400, message: 'childId is required', isOffline: false }
    const visit = {
      id: `v${Date.now()}`,
      childId: body.childId,
      type: body.type || 'Home Visit',
      status: 'scheduled',
      scheduledFor: body.scheduledFor || new Date().toISOString(),
      address: body.address || '',
      notes: body.notes || '',
    }
    visits.push(visit)
    persist()
    return withChild(visit)
  }},
  { method: 'patch', path: '/visits/:id', handler: ({ params, body }) => {
    const visit = visits.find((v) => v.id === params.id)
    if (!visit) throw { status: 404, message: 'Visit not found', isOffline: false }
    Object.assign(visit, body)
    persist()
    return withChild(visit)
  }},

  { method: 'get', path: '/health-alerts', handler: () => {
    deriveHealthAlertsFromChildren()
    const myIds = new Set(childrenForCurrentUser().map((c) => c.id))
    return healthAlerts.filter((a) => myIds.has(a.childId)).map(withChild)
  }},

  { method: 'get', path: '/meals/today', handler: () => {
    const myIds = new Set(childrenForCurrentUser().map((c) => c.id))
    return mealsToday.filter((m) => myIds.has(m.childId)).map(withChild)
  }},

  { method: 'get', path: '/notifications', handler: () => {
    const user = getCurrentUser()
    if (!user) return []
    // Notifications created before per-user tagging existed have no userId —
    // treat those as visible to everyone so existing local demo data isn't lost.
    return notifications.filter((n) => !n.userId || n.userId === user.id)
  }},
  { method: 'patch', path: '/notifications/:id/read', handler: ({ params }) => {
    const notification = notifications.find((n) => n.id === params.id)
    if (notification) notification.read = true
    persist()
    return notification
  }},
  { method: 'delete', path: '/notifications', handler: () => {
    // Only clear the alerts the current caregiver can see (admin-originated).
    // Internal 'sync' entries (self-generated on record submission) are left
    // alone since they're never surfaced in the caregiver alerts UI anyway.
    const user = getCurrentUser()
    for (let i = notifications.length - 1; i >= 0; i--) {
      const n = notifications[i]
      const belongsToUser = !n.userId || n.userId === user?.id
      if (belongsToUser && n.type !== 'sync') notifications.splice(i, 1)
    }
    persist()
    return { message: 'Alerts cleared' }
  }},

  { method: 'get', path: '/emergency-contacts', handler: () => emergencyContacts },

  // ---------- Admin ----------
  { method: 'get', path: '/admin/users', handler: ({ query }) => {
    let filtered = users
    if (query?.role) filtered = filtered.filter((u) => u.role === query.role)
    if (query?.search) {
      const q = query.search.toLowerCase()
      filtered = filtered.filter((u) => u.name.toLowerCase().includes(q) || u.phone.includes(q))
    }
    const safe = filtered.map(({ pin, ...rest }) => rest)
    return { users: safe, total: safe.length, page: 1, limit: 50 }
  }},
  { method: 'post', path: '/admin/users', handler: ({ body }) => {
    if (!body?.name || !body?.phone || !body?.pin) {
      throw { status: 400, message: 'name, phone, and pin are required', isOffline: false }
    }
    const exists = users.find((u) => normalizePhone(u.phone) === normalizePhone(body.phone))
    if (exists) {
      throw { status: 409, message: 'A user with this phone number already exists', isOffline: false }
    }
    const center = centers.find((c) => c.id === body.centerId || c.name === body.center)
    const newUser = {
      id: `u${Date.now()}`,
      name: body.name,
      role: body.role || 'caregiver',
      avatar: null,
      center: center?.name || body.center || '',
      centerId: center?.id || body.centerId || '',
      phone: body.phone,
      pin: String(body.pin),
      isActive: true,
      createdAt: new Date().toISOString(),
    }
    users.push(newUser)
    persist()
    // Never return the PIN in API responses, mirroring the real backend's toSafeJSON()
    const { pin, ...safeUser } = newUser
    return safeUser
  }},
  { method: 'patch', path: '/admin/users/:id', handler: ({ params, body }) => {
    const user = users.find((u) => u.id === params.id)
    if (user) Object.assign(user, body)
    persist()
    return user
  }},
  { method: 'delete', path: '/admin/users/:id', handler: ({ params }) => {
    const user = users.find((u) => u.id === params.id)
    if (user) user.isActive = false
    persist()
    return { message: 'User deactivated' }
  }},

  { method: 'get', path: '/admin/centers', handler: () => centers },
  { method: 'patch', path: '/admin/centers/:id', handler: ({ params, body }) => {
    const center = centers.find((c) => c.id === params.id)
    if (center) Object.assign(center, body)
    persist()
    return center
  }},

  { method: 'get', path: '/admin/audit-log', handler: () => ({ logs: auditLog, total: auditLog.length, page: 1, limit: 50 }) },

  { method: 'get', path: '/reports', handler: ({ query }) => {
    const user = getCurrentUser()
    let filtered = reports
    // Caregivers only see their own submitted reports; admins/supervisors see all.
    if (user && !['admin', 'supervisor', 'center_manager'].includes(user.role)) {
      filtered = filtered.filter((r) => r.submitterId === user.id)
    }
    if (query?.status) filtered = filtered.filter((r) => r.status === query.status)
    if (query?.reportType) filtered = filtered.filter((r) => r.reportType === query.reportType)
    return [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }},
  { method: 'post', path: '/reports', handler: ({ body }) => {
    if (!body?.reportType) throw { status: 400, message: 'reportType is required', isOffline: false }
    const user = getCurrentUser()
    const report = {
      id: `r${Date.now()}`,
      reportType: body.reportType,
      childName: body.childName || '',
      childId: body.childId || null,
      submittedBy: user?.name || 'Caregiver',
      submitterId: user?.id ?? null,
      center: user?.center || '',
      notes: body.notes || '',
      photo: body.photo || null,
      status: 'submitted',
      createdAt: body.submittedAt || new Date().toISOString(),
    }
    reports.push(report)
    // Add notification. Health reports raise a real caregiver-facing alert
    // (type: 'health'); everything else is an internal 'sync' echo of the
    // caregiver's own action and is filtered out of the caregiver alerts UI.
    const reportNotifBody = `${report.reportType} report${report.childName ? ' for ' + report.childName : ''} submitted`
    const reportDupe = notifications.find((n) => n.title === 'Report submitted' && n.body === reportNotifBody && n.userId === user?.id)
    if (!reportDupe) {
      notifications.unshift({
        id: `n${Date.now()}`,
        title: 'Report submitted',
        body: reportNotifBody,
        time: 'Just now',
        read: false,
        type: report.reportType === 'health' ? 'health' : 'sync',
        userId: user?.id ?? null,
      })
    }
    // Auto-create health alert if report is health type
    if (body.reportType === 'health' && body.childId) {
      const existing = healthAlerts.find(a => a.childId === body.childId && !a.autoDerived)
      if (!existing) {
        healthAlerts.push({
          id: `h_report_${Date.now()}`,
          childId: body.childId,
          severity: body.severity || 'medium',
          title: body.notes?.slice(0, 60) || 'Health concern reported',
          detail: body.notes || '',
          createdAt: new Date().toISOString(),
          autoDerived: false,
        })
      }
    }
    persist()
    return report
  }},
  { method: 'patch', path: '/reports/:id/review', handler: ({ params, body }) => {
    const report = reports.find((r) => r.id === params.id)
    if (report) Object.assign(report, { status: body.status, reviewNotes: body.reviewNotes })
    persist()
    return report
  }},

  { method: 'patch', path: '/health-alerts/:id', handler: ({ params, body }) => {
    const alert = healthAlerts.find((h) => h.id === params.id)
    if (alert) Object.assign(alert, body)
    persist()
    return withChild(alert)
  }},

  // ---------- Admin: PIN reset requests ----------
  { method: 'get', path: '/admin/pin-reset-requests', handler: ({ query }) => {
    let filtered = pinResetRequests
    if (query?.status) filtered = filtered.filter(r => r.status === query.status)
    return filtered
  }},
  { method: 'post', path: '/admin/pin-reset-requests/:id/resolve', handler: ({ params, body }) => {
    const req = pinResetRequests.find(r => r.id === params.id)
    if (req) { req.status = 'resolved'; req.resolvedAt = new Date().toISOString() }
    persist()
    return req
  }},
  { method: 'delete', path: '/admin/pin-reset-requests/:id', handler: ({ params }) => {
    const idx = pinResetRequests.findIndex(r => r.id === params.id)
    if (idx !== -1) pinResetRequests.splice(idx, 1)
    persist()
    return { message: 'Request dismissed' }
  }},
  { method: 'post', path: '/admin/users/:id/reset-pin', handler: ({ params, body }) => {
    const user = users.find(u => u.id === params.id)
    if (user) user.pin = String(body.newPin || '1234')
    persist()
    return { message: 'PIN reset successfully' }
  }},

  // ---------- Health alerts: Create ----------
  { method: 'post', path: '/health-alerts', handler: ({ body }) => {
    const alert = {
      id: `h_${Date.now()}`,
      childId: body.child || null,
      severity: body.severity || 'medium',
      title: body.title || 'Health alert',
      detail: body.detail || '',
      status: 'active',
      createdAt: new Date().toISOString(),
      raisedBy: getCurrentUser()?.id || null,
    }
    healthAlerts.push(alert)
    persist()
    return withChild(alert)
  }},

  // ---------- Notifications: Subscribe ----------
  { method: 'post', path: '/notifications/subscribe', handler: () => ({ message: 'Subscribed' }) },

  // ---------- Upload ----------
  { method: 'post', path: '/upload/photo', handler: () => ({ url: 'data:image/jpeg;base64,/9j/4AAQ' }) },
  { method: 'post', path: '/upload/avatar', handler: () => ({ url: 'data:image/jpeg;base64,/9j/4AAQ' }) },
]
