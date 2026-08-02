import { body } from 'express-validator'
import { isValidPhone } from '../utils/phone.js'

export const loginValidator = [
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('pin').trim().notEmpty().withMessage('PIN is required'),
]

/** Shared phone rule: digits only, normalizes to +250 followed by exactly 9 digits (12 total). */
export const phoneFieldValidator = (field = 'phone', { optional = false } = {}) => {
  const chain = body(field)
  if (optional) chain.optional({ nullable: true, checkFalsy: true })
  return chain
    .trim()
    .custom((value) => {
      if (optional && !value) return true
      if (!isValidPhone(value)) {
        throw new Error('Phone number must be a valid Rwanda number (9 digits after +250)')
      }
      return true
    })
}
