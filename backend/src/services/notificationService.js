import webpush from 'web-push'
import { env } from '../config/env.js'
import Notification from '../models/Notification.js'
import User from '../models/User.js'
import { sendFcm, sendFcmMulticast, isFcmReady } from './fcmService.js'

// --- Web Push setup ---
let pushConfigured = false
if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)
  pushConfigured = true
} else {
  console.warn('[push] VAPID keys not set — web push notifications disabled. See .env.example.')
}

if (!isFcmReady()) {
  console.warn('[fcm] Firebase credentials not set — FCM push notifications disabled. See .env.example.')
}

/**
 * Send push notifications to ALL of a user's registered devices.
 * Handles both FCM tokens (Android/iOS) and Web Push subscriptions (PWA/browser).
 * Automatically prunes stale/invalid tokens.
 */
async function deliverPushToUser(userId, { title, body, type = 'system', data = {} }) {
  const user = await User.findById(userId).select('fcmTokens pushSubscriptions')
  if (!user) return

  // --- FCM tokens (Android / iOS native) ---
  const fcmTokens = user.fcmTokens?.map(t => t.token) || []
  if (fcmTokens.length > 0 && isFcmReady()) {
    const result = await sendFcmMulticast(fcmTokens, { title, body, data: { type, ...data } })
    if (result.invalidTokens.length > 0) {
      // Prune dead tokens
      await User.updateOne(
        { _id: userId },
        { $pull: { fcmTokens: { token: { $in: result.invalidTokens } } } }
      ).catch(() => {})
    }
  }

  // --- Web Push subscriptions (PWA / browser) ---
  if (pushConfigured && user.pushSubscriptions?.length > 0) {
    const payload = JSON.stringify({ title, body, type, ...data })
    const staleSubs = []
    for (const sub of user.pushSubscriptions) {
      try {
        await webpush.sendNotification(sub, payload)
      } catch (err) {
        if ([404, 410].includes(err.statusCode)) {
          staleSubs.push(sub.endpoint)
        } else {
          console.error('[web-push] send failed:', err.message)
        }
      }
    }
    if (staleSubs.length > 0) {
      await User.updateOne(
        { _id: userId },
        { $pull: { pushSubscriptions: { endpoint: { $in: staleSubs } } } }
      ).catch(() => {})
    }
  }
}

/** Creates an in-app notification row and delivers push to all the user's devices. */
export async function notifyUser(userId, { title, body, type = 'system', relatedEntity = null, data = {} }) {
  const notification = await Notification.create({ user: userId, title, body, type, relatedEntity })

  // Fire-and-forget push delivery — never block the caller
  const pushData = {
    type,
    notificationId: String(notification._id),
    ...(relatedEntity ? { route: `/notifications` } : {}),
    ...data,
  }
  deliverPushToUser(userId, { title, body, type, data: pushData }).catch((err) => {
    console.error('[push] delivery failed for user', userId, ':', err.message)
  })

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

/**
 * Send a push notification to multiple users at once (batch-friendly).
 * Used by adminSendNotification to efficiently deliver to many caregivers.
 */
export async function notifyUsers(userIds, { title, body, type = 'system' }) {
  // Create in-app notification rows
  const notifications = await Notification.insertMany(
    userIds.map(uid => ({ user: uid, title, body, type }))
  )

  // Deliver push to each user (fire-and-forget)
  userIds.forEach((uid, idx) => {
    const notif = notifications[idx]
    deliverPushToUser(uid, {
      title,
      body,
      type,
      data: { type, notificationId: String(notif._id), route: '/notifications' },
    }).catch((err) => {
      console.error('[push] batch delivery failed for user', uid, ':', err.message)
    })
  })

  return notifications
}
