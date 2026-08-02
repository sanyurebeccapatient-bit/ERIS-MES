import { Router } from 'express'
import { getTodayAttendance, recordAttendance } from '../controllers/attendance.controller.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/today', getTodayAttendance)
router.post('/', recordAttendance)

export default router
