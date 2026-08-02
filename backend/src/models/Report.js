import mongoose from 'mongoose'
const { Schema } = mongoose

const reportSchema = new Schema(
  {
    reportType: { type: String, enum: ['attendance', 'health', 'visit', 'general'], required: true },
    child: { type: Schema.Types.ObjectId, ref: 'Child', default: null },
    childNameFreeText: { type: String, trim: true, default: '' }, // fallback if child wasn't matched to a record
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    center: { type: Schema.Types.ObjectId, ref: 'Center', default: null },
    notes: { type: String, trim: true, default: '' },
    photoUrls: [{ type: String }],
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      capturedAt: Date,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected'],
      default: 'submitted',
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewNotes: { type: String, trim: true, default: '' },
    clientRecordId: { type: String, index: true, sparse: true }, // dedupe key from offline queue
  },
  { timestamps: true }
)

export default mongoose.model('Report', reportSchema)
