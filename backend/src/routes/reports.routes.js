import { Router } from 'express'
import { createReport, listReports, reviewReport } from '../controllers/reports.controller.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/', listReports)
router.post('/', createReport)
router.patch('/:id/review', requireAdmin, reviewReport)

export default router
