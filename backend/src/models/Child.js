import mongoose from 'mongoose'
const { Schema } = mongoose

const childSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, default: null },
    age: { type: Number, default: null }, // denormalized for fast list rendering; recomputed on write
    gender: { type: String, enum: ['M', 'F', 'other'], required: true },

    guardian: {
      name: { type: String, required: true, trim: true },
      relationship: { type: String, default: 'Parent' },
      phone: { type: String, trim: true },
    },

    center: { type: Schema.Types.ObjectId, ref: 'Center', required: true, index: true },
    assignedCaregiver: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    photoUrl: { type: String, default: null },

    healthFlag: { type: String, enum: ['low', 'medium', 'high', 'critical', null], default: null },

    address: { type: String, trim: true },
    location: {
      type: { type: String, enum: ['Point'], default: undefined },
      coordinates: { type: [Number], default: undefined },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

childSchema.index({ location: '2dsphere' }, { sparse: true })
childSchema.index({ name: 'text' })

export default mongoose.model('Child', childSchema)
