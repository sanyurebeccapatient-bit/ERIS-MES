import { Router } from 'express'
import { getTodayMeals, recordMeal } from '../controllers/meals.controller.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/today', getTodayMeals)
router.post('/', recordMeal)

export default router
