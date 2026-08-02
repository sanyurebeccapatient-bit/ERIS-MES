import mongoose from 'mongoose'
const { Schema } = mongoose

const centerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, unique: true, sparse: true },
    district: { type: String, trim: true },
    sector: { type: String, trim: true },
    address: { type: String, trim: true },
    location: {
      type: { type: String, enum: ['Point'], default: undefined },
      coordinates: { type: [Number], default: undefined }, // [lng, lat]
    },
    manager: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    capacity: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

centerSchema.index({ location: '2dsphere' }, { sparse: true })

export default mongoose.model('Center', centerSchema)
