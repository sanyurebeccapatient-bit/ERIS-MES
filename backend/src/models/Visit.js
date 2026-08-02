import mongoose from 'mongoose'
const { Schema } = mongoose

const visitSchema = new Schema(
  {
    child: { type: Schema.Types.ObjectId, ref: 'Child', required: true, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['Home Visit', 'Health Follow-up', 'Nutrition Check', 'Enrollment Visit', 'Other'],
      default: 'Home Visit',
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'missed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    scheduledFor: { type: Date, required: true, index: true },
    completedAt: { type: Date, default: null },
    address: { type: String, trim: true },
    notes: { type: String, trim: true, default: '' },
    outcome: { type: String, trim: true, default: '' },
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      capturedAt: Date,
    },
    photoUrls: [{ type: String }],
    clientRecordId: { type: String, index: true, sparse: true },
  },
  { timestamps: true }
)

export default mongoose.model('Visit', visitSchema)
