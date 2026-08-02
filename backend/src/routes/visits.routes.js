import { Router } from 'express'
import { listVisits, getUpcomingVisits, createVisit, updateVisit } from '../controllers/visits.controller.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/', listVisits)
router.get('/upcoming', getUpcomingVisits)
router.post('/', createVisit)
router.patch('/:id', updateVisit)

export default router
