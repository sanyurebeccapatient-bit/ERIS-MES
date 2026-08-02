import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

let io = null

/**
 * Real-time channel for the admin dashboard: live attendance updates,
 * new health alerts, and sync activity from field devices. Caregiver
 * clients don't need this — they operate offline-first and poll/sync
 * on their own schedule — so only admin/supervisor sockets join the
 * 'admin' room.
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()), credentials: true },
  })

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('Authentication required'))
      const payload = jwt.verify(token, env.JWT_SECRET)
      socket.userId = payload.sub
      socket.role = payload.role
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    if (['admin', 'supervisor'].includes(socket.role)) {
      socket.join('admin')
    }
    socket.on('disconnect', () => {})
  })

  return io
}

/** Emits an event to all connected admin/supervisor dashboards. Safe no-op if sockets aren't initialized. */
export function emitToAdmins(event, payload) {
  if (!io) return
  io.to('admin').emit(event, payload)
}

export function getIO() {
  return io
}
