import Notification from '../models/Notification.js'
import User from '../models/User.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/AppError.js'

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

/** POST /api/notifications/subscribe — register a Web Push subscription for this device */
export const subscribePush = asyncHandler(async (req, res) => {
  const subscription = req.body
  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { pushSubscriptions: subscription },
  })
  res.status(201).json({ message: 'Subscribed' })
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

/** POST /api/notifications/admin — admin sends notification to user(s) */
export const adminSendNotification = asyncHandler(async (req, res) => {
  const { userIds, title, body, type } = req.body
  if (!title) throw new AppError('Title is required', 400)
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new AppError('At least one userId is required', 400)
  }

  const validType = ['health', 'visit', 'system', 'report', 'alert'].includes(type) ? type : 'system'
  const notifications = await Notification.insertMany(
    userIds.map(uid => ({
      user: uid,
      title,
      body: body || '',
      type: validType,
      sentBy: req.user._id,
    }))
  )
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
