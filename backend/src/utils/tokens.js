import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { env } from '../config/env.js'

export function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  })
}

/** Refresh tokens are opaque random strings, stored hashed-free (short-lived + revocable list) for simplicity. */
export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex')
}

export function refreshTokenExpiryDate() {
  const days = parseInt(env.JWT_REFRESH_EXPIRES_IN) || 30
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}
