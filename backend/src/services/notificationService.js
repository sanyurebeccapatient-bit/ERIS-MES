import webpush from 'web-push'
import { env } from '../config/env.js'
import Notification from '../models/Notification.js'
import User from '../models/User.js'

let pushConfigured = false
if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)
  pushConfigured = true
} else {
  console.warn('[push] VAPID keys not set — push notifications disabled. See .env.example.')
}

/** Creates an in-app notification row and (if configured) sends a web push to all of the user's devices. */
export async function notifyUser(userId, { title, body, type = 'system', relatedEntity = null }) {
  const notification = await Notification.create({ user: userId, title, body, type, relatedEntity })

  if (pushConfigured) {
    const user = await User.findById(userId).select('pushSubscriptions')
    const payload = JSON.stringify({ title, body, type })
    for (const sub of user?.pushSubscriptions || []) {
      webpush.sendNotification(sub, payload).catch((err) => {
        // 410/404 means the subscription is stale — silently ignore here;
        // a cleanup job could prune these periodically.
        if (![404, 410].includes(err.statusCode)) {
          console.error('[push] send failed:', err.message)
        }
      })
    }
  }

  return notification
}

/** Notifies all admins/supervisors — used for high-severity health alerts. */
export async function notifySupervisorsOfHealthAlert(alert) {
  const supervisors = await User.find({ role: { $in: ['admin', 'supervisor'] }, isActive: true }).select('_id')
  await Promise.all(
    supervisors.map((s) =>
      notifyUser(s._id, {
        title: 'High-severity health alert',
        body: alert.title,
        type: 'health',
        relatedEntity: { kind: 'HealthAlert', id: alert._id },
      })
    )
  )
}

/** Notifies all admins/supervisors that a new report was submitted and needs review. */
export async function notifyAdminsOfReport(report) {
  const admins = await User.find({ role: { $in: ['admin', 'supervisor'] }, isActive: true }).select('_id')
  const typeLabels = { attendance: 'Attendance report', health: 'Health report', visit: 'Visit report', general: 'General report' }
  await Promise.all(
    admins.map((a) =>
      notifyUser(a._id, {
        title: typeLabels[report.reportType] || 'New report',
        body: 'A new report was submitted and is awaiting review.',
        type: 'report',
        relatedEntity: { kind: 'Report', id: report._id },
      })
    )
  )
}
