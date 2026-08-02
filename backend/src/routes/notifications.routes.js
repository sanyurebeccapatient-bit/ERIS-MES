import { Router } from 'express'
import {
  listNotifications,
  markRead,
  subscribePush,
  adminListNotifications,
  adminNotificationStats,
  adminSendNotification,
  deleteNotification,
  clearNotifications,
} from '../controllers/notifications.controller.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// Caregiver endpoints
router.get('/', listNotifications)
router.patch('/:id/read', markRead)
router.delete('/', clearNotifications)
router.post('/subscribe', subscribePush)

// Admin endpoints
router.get('/admin', requireAdmin, adminListNotifications)
router.get('/admin/stats', requireAdmin, adminNotificationStats)
router.post('/admin', requireAdmin, adminSendNotification)
router.delete('/:id', requireAdmin, deleteNotification)

export default router
