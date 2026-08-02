import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import path from 'path'
import { env, isProd } from './config/env.js'
import routes from './routes/index.js'
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js'
import { apiLimiter } from './middleware/rateLimiter.js'

const app = express()

// Trust proxy — needed for correct req.ip behind Render/Heroku/nginx
app.set('trust proxy', 1)

app.use(
  helmet({
    // Allow the frontend (different origin in dev) to load uploaded images
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
)
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
  })
)
app.use(compression())
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(morgan(isProd ? 'combined' : 'dev'))

// Static file serving for uploaded photos with caching
app.use('/uploads', express.static(path.resolve(process.cwd(), env.UPLOAD_DIR), {
  maxAge: '7d',
  immutable: true,
}))

// API routes
app.use('/api', apiLimiter, routes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
