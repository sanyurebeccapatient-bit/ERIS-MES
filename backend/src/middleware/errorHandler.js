import { isProd } from '../config/env.js'

/** 404 handler — placed after all routes. */
export function notFoundHandler(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` })
}

/** Central error handler — must be registered last with 4 args for Express to recognize it. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal server error'

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 422
    message = Object.values(err.errors).map((e) => e.message).join(', ')
  }
  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409
    const field = Object.keys(err.keyValue || {})[0]
    message = field ? `${field} already in use` : 'Duplicate value'
  }
  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400
    message = `Invalid ${err.path}: ${err.value}`
  }

  if (!err.isOperational && statusCode === 500) {
    console.error('[error]', err)
  }

  res.status(statusCode).json({
    message,
    ...(err.details ? { details: err.details } : {}),
    ...(isProd ? {} : { stack: err.stack }),
  })
}
