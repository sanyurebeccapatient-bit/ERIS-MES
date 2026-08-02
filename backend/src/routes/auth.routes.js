import { Router } from 'express'
import { login, refresh, logout, me, updateMe } from '../controllers/auth.controller.js'
import { requestPinReset } from '../controllers/pinReset.controller.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { loginValidator, phoneFieldValidator } from '../validators/auth.validator.js'
import { authLimiter } from '../middleware/rateLimiter.js'

const router = Router()

router.post('/login', authLimiter, loginValidator, validate, login)
router.post('/request-pin-reset', authLimiter, requestPinReset)
router.post('/refresh', refresh)
router.post('/logout', requireAuth, logout)
router.get('/me', requireAuth, me)
router.patch('/me', requireAuth, phoneFieldValidator('phone', { optional: true }), validate, updateMe)

export default router
