import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import User from '../models/User.js'
import { AppError } from '../utils/AppError.js'

/** Verifies the access token and attaches req.user (lean, minus sensitive fields). */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) throw new AppError('Authentication required', 401)

    let payload
    try {
      payload = jwt.verify(token, env.JWT_SECRET)
    } catch {
      throw new AppError('Invalid or expired token', 401)
    }

    const user = await User.findById(payload.sub)
    if (!user || !user.isActive) throw new AppError('Account not found or inactive', 401)

    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}

/** Restricts a route to specific roles. Use after requireAuth. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Authentication required', 401))
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403))
    }
    next()
  }
}

/** Convenience: admin or supervisor */
export const requireAdmin = requireRole('admin', 'supervisor')
