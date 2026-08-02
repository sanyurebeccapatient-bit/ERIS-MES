import http from 'http'
import app from './app.js'
import { env } from './config/env.js'
import { connectDB, disconnectDB } from './config/database.js'
import { initSocket } from './services/socket.js'

const server = http.createServer(app)
initSocket(server)

async function start() {
  await connectDB()

  server.listen(env.PORT, () => {
    console.log(`[server] ERIS MES API running on port ${env.PORT} (${env.NODE_ENV})`)
    console.log(`[server] Health check: http://localhost:${env.PORT}/api/health`)
  })
}

start().catch((err) => {
  console.error('[server] Failed to start:', err)
  process.exit(1)
})

// Graceful shutdown
async function shutdown(signal) {
  console.log(`\n[server] Received ${signal}, shutting down gracefully…`)
  server.close(async () => {
    await disconnectDB()
    console.log('[server] Shutdown complete')
    process.exit(0)
  })
  // Force exit if graceful shutdown hangs
  setTimeout(() => process.exit(1), 10000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason)
})
