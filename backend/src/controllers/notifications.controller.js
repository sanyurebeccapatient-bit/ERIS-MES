import Notification from '../models/Notification.js'
import User from '../models/User.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/AppError.js'
import { notifyUsers } from '../services/notificationService.js'

/** GET /api/notifications */
export const listNotifications = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id }
  if (req.query.type) filter.type = req.query.type
  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50)
  res.json(notifications)
})

/** PATCH /api/notifications/:id/read */
export const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  )
  res.json(notification)
})

/**
 * POST /api/notifications/subscribe
 *
 * Accepts two formats:
 *  1. Web Push subscription: { endpoint, keys: { p256dh, auth } }
 *  2. FCM device token:      { token, platform: 'android'|'ios' }
 */
export const subscribePush = asyncHandler(async (req, res) => {
  const body = req.body

  // FCM token from Capacitor native app
  if (body.token && body.platform) {
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { fcmTokens: { token: body.token, platform: body.platform } },
    })
    return res.status(201).json({ message: 'FCM token registered' })
  }

  // Web Push subscription (endpoint + keys)
  if (body.endpoint && body.keys) {
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { pushSubscriptions: body },
    })
    return res.status(201).json({ message: 'Web push subscription registered' })
  }

  throw new AppError('Invalid push subscription payload', 400)
})

/**
 * POST /api/notifications/unsubscribe
 * Remove a specific device token or web-push subscription.
 */
export const unsubscribePush = asyncHandler(async (req, res) => {
  const { token, endpoint } = req.body
  const update = {}
  if (token) update.$pull = { fcmTokens: { token } }
  else if (endpoint) update.$pull = { pushSubscriptions: { endpoint } }
  else throw new AppError('Provide token or endpoint to unsubscribe', 400)

  await User.findByIdAndUpdate(req.user._id, update)
  res.json({ message: 'Unsubscribed' })
})

/** GET /api/notifications/admin — admin lists all users' notifications */
export const adminListNotifications = asyncHandler(async (req, res) => {
  const filter = {}
  if (req.query.userId) filter.user = req.query.userId
  if (req.query.type) filter.type = req.query.type
  if (req.query.read !== undefined) filter.read = req.query.read === 'true'
  const notifications = await Notification.find(filter)
    .populate('user', 'name role phone')
    .sort({ createdAt: -1 })
    .limit(100)
  res.json(notifications)
})

/** GET /api/notifications/admin/stats — quick counts for admin */
export const adminNotificationStats = asyncHandler(async (req, res) => {
  const total = await Notification.countDocuments({})
  const unread = await Notification.countDocuments({ read: false })
  const byType = await Notification.aggregate([
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ])
  res.json({ total, unread, byType })
})

/**
 * POST /api/notifications/admin — admin sends notification to user(s)
 * Creates in-app records AND delivers push notifications (FCM + web-push).
 */
export const adminSendNotification = asyncHandler(async (req, res) => {
  const { userIds, title, body, type } = req.body
  if (!title) throw new AppError('Title is required', 400)
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new AppError('At least one userId is required', 400)
  }

  const validType = ['health', 'visit', 'system', 'report', 'alert'].includes(type) ? type : 'system'

  // This creates DB records AND fires push to every user's devices
  const notifications = await notifyUsers(userIds, { title, body: body || '', type: validType })

  res.status(201).json({ created: notifications.length })
})

/** DELETE /api/notifications/:id — admin deletes a notification */
export const deleteNotification = asyncHandler(async (req, res) => {
  const result = await Notification.findByIdAndDelete(req.params.id)
  if (!result) throw new AppError('Notification not found', 404)
  res.json({ message: 'Deleted' })
})

/** DELETE /api/notifications — clear all admin-originated alerts for current user */
export const clearNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ user: req.user._id, type: { $ne: 'sync' } })
  res.json({ message: 'Cleared' })
})
