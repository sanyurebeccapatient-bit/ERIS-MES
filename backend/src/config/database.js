import mongoose from 'mongoose'
import dns from 'node:dns'
import { env } from './env.js'

// Some local/ISP routers (common cause on Windows here) advertise a DNS
// server that doesn't support SRV record queries, which breaks the
// mongodb+srv:// connection string with `querySrv ECONNREFUSED`.
// Force Node's resolver to use public DNS servers that do support it.
dns.setServers(['8.8.8.8', '1.1.1.1'])

export async function connectDB() {
  mongoose.set('strictQuery', true)

  const connect = async (retriesLeft = 5) => {
    try {
      await mongoose.connect(env.MONGO_URI)
      console.log(`[db] Connected to MongoDB: ${mongoose.connection.name}`)
    } catch (err) {
      console.error(`[db] Connection failed: ${err.message}`)
      if (retriesLeft > 0) {
        console.log(`[db] Retrying in 5s… (${retriesLeft} attempts left)`)
        await new Promise((r) => setTimeout(r, 5000))
        return connect(retriesLeft - 1)
      }
      throw err
    }
  }

  await connect()

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected')
  })
  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB error:', err.message)
  })
}

export async function disconnectDB() {
  await mongoose.disconnect()
}
