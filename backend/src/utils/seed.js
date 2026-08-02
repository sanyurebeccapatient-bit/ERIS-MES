/**
 * Seed script — populates the database with minimal data.
 * Only creates user accounts and a center — NO sample children,
 * visits, health alerts, attendance, or reports.
 *
 * Run with: npm run seed
 */
import { connectDB, disconnectDB } from '../config/database.js'
import User from '../models/User.js'
import Center from '../models/Center.js'
import Child from '../models/Child.js'
import Visit from '../models/Visit.js'
import HealthAlert from '../models/HealthAlert.js'
import EmergencyContact from '../models/EmergencyContact.js'
import Attendance from '../models/Attendance.js'

async function seed() {
  await connectDB()
  console.log('[seed] Clearing existing data…')
  await Promise.all([
    User.deleteMany({}),
    Center.deleteMany({}),
    Child.deleteMany({}),
    Visit.deleteMany({}),
    HealthAlert.deleteMany({}),
    EmergencyContact.deleteMany({}),
    Attendance.deleteMany({}),
  ])

  console.log('[seed] Creating center…')
  const center = await Center.create({
    name: 'Kicukiro ECD Center',
    code: 'KIC-001',
    district: 'Kicukiro',
    sector: 'Gatenga',
    address: 'Kicukiro, Kigali',
    capacity: 60,
  })

  console.log('[seed] Creating users…')
  const caregiver = new User({
    name: 'Grace Uwimana',
    phone: '+250788123456',
    role: 'caregiver',
    center: center._id,
  })
  await caregiver.setPin('1234')
  await caregiver.save()

  const admin = new User({
    name: 'Alice Karenzi',
    phone: '+250788999000',
    role: 'admin',
    center: center._id,
  })
  await admin.setPin('1234')
  await admin.save()

  center.manager = admin._id
  await center.save()

  console.log('[seed] Creating emergency contacts…')
  await EmergencyContact.insertMany([
    { name: 'District Health Office', phone: '+250788000111', type: 'health', center: null },
    { name: 'Center Supervisor — Alice K.', phone: '+250788222333', type: 'supervisor', center: center._id },
    { name: 'National ECD Hotline', phone: '114', type: 'hotline', center: null },
  ])

  console.log('\n[seed] Done. System starts with 0 children/visits/alerts.')
  console.log('Test accounts:')
  console.log(`  Caregiver — phone: ${caregiver.phone}  PIN: 1234`)
  console.log(`  Admin     — phone: ${admin.phone}  PIN: 1234`)

  await disconnectDB()
  process.exit(0)
}

seed().catch((err) => {
  console.error('[seed] Failed:', err)
  process.exit(1)
})
