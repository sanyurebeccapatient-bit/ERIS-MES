import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { normalizePhone } from '../utils/phone.js'

const { Schema } = mongoose

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true, index: true, set: normalizePhone },
    email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    pinHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['caregiver', 'field_officer', 'center_manager', 'supervisor', 'admin'],
      default: 'caregiver',
      index: true,
    },
    center: { type: Schema.Types.ObjectId, ref: 'Center', default: null },
    avatarUrl: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },

    // Web Push subscriptions for this device/browser
    pushSubscriptions: [
      {
        endpoint: String,
        keys: { p256dh: String, auth: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    refreshTokens: [
      {
        token: { type: String, select: false },
        createdAt: { type: Date, default: Date.now },
        expiresAt: Date,
      },
    ],
  },
  { timestamps: true }
)

userSchema.methods.setPin = async function (pin) {
  this.pinHash = await bcrypt.hash(pin, 10)
}

userSchema.methods.comparePin = async function (pin) {
  return bcrypt.compare(pin, this.pinHash)
}

userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject({ virtuals: true })
  delete obj.pinHash
  delete obj.refreshTokens
  delete obj.__v
  return obj
}

export default mongoose.model('User', userSchema)
