import { Router } from 'express'
import { listEmergencyContacts } from '../controllers/emergencyContacts.controller.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/', listEmergencyContacts)

export default router
