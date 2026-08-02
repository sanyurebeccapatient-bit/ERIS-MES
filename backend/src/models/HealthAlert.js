import mongoose from 'mongoose'
const { Schema } = mongoose

const healthAlertSchema = new Schema(
  {
    child: { type: Schema.Types.ObjectId, ref: 'Child', required: true, index: true },
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true, index: true },
    title: { type: String, required: true, trim: true },
    detail: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['open', 'in_review', 'referred', 'resolved'], default: 'open', index: true },
    referredTo: { type: String, trim: true, default: '' },
    resolvedAt: { type: Date, default: null },
    photoUrls: [{ type: String }],
  },
  { timestamps: true }
)

export default mongoose.model('HealthAlert', healthAlertSchema)
