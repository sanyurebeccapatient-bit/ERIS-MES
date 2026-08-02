import mongoose from 'mongoose'
const { Schema } = mongoose

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    type: { type: String, enum: ['sync', 'health', 'visit', 'system', 'report', 'alert'], default: 'system' },
    read: { type: Boolean, default: false, index: true },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    relatedEntity: {
      kind: { type: String, enum: ['Child', 'Visit', 'HealthAlert', 'Report', null], default: null },
      id: { type: Schema.Types.ObjectId, default: null },
    },
  },
  { timestamps: true }
)

export default mongoose.model('Notification', notificationSchema)
