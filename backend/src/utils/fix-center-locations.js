/**
 * fix-center-locations.js — one-off repair for existing Center documents
 * saved with an incomplete GeoJSON `location` (e.g. { type: 'Point' } with
 * no coordinates). Mongo's 2dsphere index cannot index a Point missing
 * coordinates, which causes "Can't extract geo keys" errors on any write
 * that touches an affected document (including unrelated field updates,
 * e.g. editing a center's name or capacity).
 *
 * Safe to run against a live database at any time — it only unsets the
 * `location` field on documents where it's malformed; every other field is
 * left untouched.
 *
 * Usage:
 *   node src/utils/fix-center-locations.js
 */
import { connectDB, disconnectDB } from '../config/database.js'
import Center from '../models/Center.js'

async function run() {
  await connectDB()

  const result = await Center.updateMany(
    {
      $or: [
        { 'location.type': { $exists: true }, 'location.coordinates': { $exists: false } },
        { 'location.type': { $exists: true }, 'location.coordinates': { $size: 0 } },
      ],
    },
    { $unset: { location: '' } }
  )

  console.log(`Repaired ${result.modifiedCount} center record(s) with an invalid location.`)
  await disconnectDB()
}

run().catch((err) => {
  console.error('[fix-center-locations] Failed:', err)
  process.exit(1)
})
