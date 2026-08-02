import http from 'http'
import app from './app.js'
import { env } from './config/env.js'
import { connectDB, disconnectDB } from './config/database.js'
import { initSocket } from './services/socket.js'
import Center from './models/Center.js'
import Child from './models/Child.js'

const server = http.createServer(app)
initSocket(server)

// Repairs any previously-saved documents with an incomplete GeoJSON
// `location` (e.g. { type: 'Point' } with no coordinates), which would
// otherwise cause "Can't extract geo keys" on the 2dsphere index for any
// write that touches them. Idempotent and safe to run on every boot.
async function repairLegacyGeoLocations() {
  const geoFilter = {
    $or: [
      { 'location.type': { $exists: true }, 'location.coordinates': { $exists: false } },
      { 'location.type': { $exists: true }, 'location.coordinates': { $size: 0 } },
    ],
  }
  const [centers, children] = await Promise.all([
    Center.updateMany(geoFilter, { $unset: { location: '' } }),
    Child.updateMany(geoFilter, { $unset: { location: '' } }),
  ])
  if (centers.modifiedCount || children.modifiedCount) {
    console.log(
      `[db] Repaired invalid location on ${centers.modifiedCount} center(s), ${children.modifiedCount} child record(s)`
    )
  }
}

async function start() {
  await connectDB()
  await repairLegacyGeoLocations().catch((err) => {
    console.error('[db] Legacy geo-location repair failed (non-fatal):', err.message)
  })

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
