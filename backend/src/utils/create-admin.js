/**
 * create-admin.js — creates (or promotes) a single admin account without
 * touching any other data. Safe to run against a live database at any time.
 *
 * Usage (CLI args):
 *   node src/utils/create-admin.js --name "Alice Karenzi" --phone +250788999000 --pin 1234 --email alice@eris.rw
 *
 * Usage (env vars — handy for deploy hooks):
 *   ADMIN_NAME="Alice Karenzi" ADMIN_PHONE=+250788999000 ADMIN_PIN=1234 ADMIN_EMAIL=alice@eris.rw npm run create-admin
 *
 * If an account with the given phone already exists, it is promoted to the
 * admin role (and its PIN/email updated if provided) instead of failing.
 */
import { connectDB, disconnectDB } from '../config/database.js'
import User from '../models/User.js'
import { normalizePhone } from './phone.js'

function parseArgs() {
  const args = {}
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2)
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true
      args[key] = value
    }
  }
  return args
}

async function createAdmin() {
  const args = parseArgs()

  const name = args.name || process.env.ADMIN_NAME
  const phone = args.phone || process.env.ADMIN_PHONE
  const pin = args.pin || process.env.ADMIN_PIN
  const email = args.email || process.env.ADMIN_EMAIL || undefined

  if (!name || !phone || !pin) {
    console.error('[create-admin] Missing required fields.')
    console.error('  Required: --name, --phone, --pin  (or ADMIN_NAME / ADMIN_PHONE / ADMIN_PIN env vars)')
    console.error('  Optional: --email  (or ADMIN_EMAIL)')
    process.exit(1)
  }

  if (!/^\d{6}$/.test(String(pin))) {
    console.error('[create-admin] PIN must be exactly 6 digits.')
    process.exit(1)
  }

  await connectDB()

  const normalizedPhone = normalizePhone(phone)

  try {
    let user = await User.findOne({ phone: normalizedPhone })

    if (user) {
      user.name = name
      user.role = 'admin'
      user.isActive = true
      if (email) user.email = email.toLowerCase()
      await user.setPin(pin)
      await user.save()
      console.log(`[create-admin] Existing account promoted to admin: ${user.phone}`)
    } else {
      user = new User({ name, phone: normalizedPhone, role: 'admin', email: email ? email.toLowerCase() : undefined })
      await user.setPin(pin)
      await user.save()
      console.log(`[create-admin] Admin account created: ${user.phone}`)
    }

    console.log(`  Name : ${user.name}`)
    console.log(`  Phone: ${user.phone}`)
    if (user.email) console.log(`  Email: ${user.email}`)
    console.log(`  Role : ${user.role}`)
  } catch (err) {
    if (err.code === 11000) {
      console.error('[create-admin] A user with this phone or email already exists on a different account.')
    } else {
      console.error('[create-admin] Failed:', err.message)
    }
    await disconnectDB()
    process.exit(1)
  }

  await disconnectDB()
  process.exit(0)
}

createAdmin()
