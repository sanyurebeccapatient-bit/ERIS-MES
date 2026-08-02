import { Router } from 'express'
import { listUsers, createUser, updateUser, deactivateUser, resetUserPin, removeUser } from '../controllers/adminUsers.controller.js'
import { listCenters, createCenter, updateCenter } from '../controllers/centers.controller.js'
import { listAuditLog, clearAuditLog } from '../controllers/auditLog.controller.js'
import {
  listPinResetRequests,
  resolvePinResetRequest,
  cancelPinResetRequest,
} from '../controllers/pinReset.controller.js'
import { requireAuth, requireAdmin, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { phoneFieldValidator } from '../validators/auth.validator.js'

const router = Router()
router.use(requireAuth, requireAdmin)

router.get('/users', listUsers)
router.post('/users', phoneFieldValidator('phone'), validate, createUser)
router.patch('/users/:id', updateUser)
router.post('/users/:id/reset-pin', resetUserPin)
router.delete('/users/:id', deactivateUser)
router.delete('/users/:id/remove', removeUser)

router.get('/pin-reset-requests', listPinResetRequests)
router.post('/pin-reset-requests/:id/resolve', resolvePinResetRequest)
router.delete('/pin-reset-requests/:id', cancelPinResetRequest)

router.get('/centers', listCenters)
router.post('/centers', createCenter)
router.patch('/centers/:id', updateCenter)

router.get('/audit-log', listAuditLog)
router.delete('/audit-log', requireRole('admin'), clearAuditLog)

export default router
