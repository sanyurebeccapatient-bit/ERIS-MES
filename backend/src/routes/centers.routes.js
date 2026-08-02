import { Router } from 'express'
import { listCenters } from '../controllers/centers.controller.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/', listCenters)

export default router
