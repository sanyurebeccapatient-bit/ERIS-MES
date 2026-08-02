import { Router } from 'express'
import { listHealthAlerts, createHealthAlert, updateHealthAlert } from '../controllers/healthAlerts.controller.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/', listHealthAlerts)
router.post('/', createHealthAlert)
router.patch('/:id', updateHealthAlert)

export default router
