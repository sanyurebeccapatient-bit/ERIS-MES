import mongoose from 'mongoose'
const { Schema } = mongoose

const pinResetRequestSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    phone: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'resolved', 'cancelled'], default: 'pending', index: true },
    note: { type: String, default: '' },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

export default mongoose.model('PinResetRequest', pinResetRequestSchema)
