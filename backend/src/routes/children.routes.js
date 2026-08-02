import { Router } from 'express'
import {
  listChildren,
  getChild,
  createChild,
  updateChild,
  deleteChild,
} from '../controllers/children.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { createChildValidator } from '../validators/child.validator.js'

const router = Router()

router.use(requireAuth)

/** Caregivers/field officers always create within their own center — fill it in before validation runs. */
function fillOwnCenter(req, res, next) {
  if (['caregiver', 'field_officer'].includes(req.user.role) && !req.body.center) {
    req.body.center = req.user.center
  }
  next()
}

router.get('/', listChildren)
router.get('/:id', getChild)
router.post(
  '/',
  requireRole('caregiver', 'field_officer', 'center_manager', 'supervisor', 'admin'),
  fillOwnCenter,
  createChildValidator,
  validate,
  createChild
)
router.put(
  '/:id',
  requireRole('caregiver', 'field_officer', 'center_manager', 'supervisor', 'admin'),
  updateChild
)
router.delete(
  '/:id',
  requireRole('caregiver', 'field_officer', 'center_manager', 'supervisor', 'admin'),
  deleteChild
)

export default router
