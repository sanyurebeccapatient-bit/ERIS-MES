import { Router } from 'express'

import authRoutes from './auth.routes.js'
import childrenRoutes from './children.routes.js'
import attendanceRoutes from './attendance.routes.js'
import visitsRoutes from './visits.routes.js'
import healthAlertsRoutes from './healthAlerts.routes.js'
import mealsRoutes from './meals.routes.js'
import reportsRoutes from './reports.routes.js'
import notificationsRoutes from './notifications.routes.js'
import emergencyContactsRoutes from './emergencyContacts.routes.js'
import dashboardRoutes from './dashboard.routes.js'
import uploadRoutes from './upload.routes.js'
import centersRoutes from './centers.routes.js'
import adminRoutes from './admin.routes.js'

const router = Router()

router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

router.use('/auth', authRoutes)
router.use('/children', childrenRoutes)
router.use('/attendance', attendanceRoutes)
router.use('/visits', visitsRoutes)
router.use('/health-alerts', healthAlertsRoutes)
router.use('/meals', mealsRoutes)
router.use('/reports', reportsRoutes)
router.use('/notifications', notificationsRoutes)
router.use('/emergency-contacts', emergencyContactsRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/upload', uploadRoutes)
router.use('/centers', centersRoutes)
router.use('/admin', adminRoutes)

export default router
