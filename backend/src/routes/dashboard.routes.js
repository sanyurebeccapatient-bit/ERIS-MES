import { Router } from 'express'
import { getCaregiverDashboard, getAdminDashboard } from '../controllers/dashboard.controller.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/caregiver', getCaregiverDashboard)
router.get('/admin', requireAdmin, getAdminDashboard)

export default router
