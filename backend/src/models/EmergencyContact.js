import mongoose from 'mongoose'
const { Schema } = mongoose

const emergencyContactSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    type: { type: String, enum: ['health', 'supervisor', 'hotline', 'police', 'other'], default: 'other' },
    center: { type: Schema.Types.ObjectId, ref: 'Center', default: null }, // null = global/national contact
  },
  { timestamps: true }
)

export default mongoose.model('EmergencyContact', emergencyContactSchema)
