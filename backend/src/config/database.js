import mongoose from 'mongoose'
import { env } from './env.js'

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
