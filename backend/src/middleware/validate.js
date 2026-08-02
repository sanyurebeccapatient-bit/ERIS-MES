import { validationResult } from 'express-validator'
import { AppError } from '../utils/AppError.js'

/** Run after express-validator chains to collect errors into a consistent 422 response. */
export function validate(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({ field: e.path, message: e.msg }))
    return next(new AppError('Validation failed', 422, details))
  }
  next()
}
