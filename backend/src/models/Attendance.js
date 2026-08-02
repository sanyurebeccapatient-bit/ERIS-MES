import mongoose from 'mongoose'
const { Schema } = mongoose

const attendanceSchema = new Schema(
  {
    child: { type: Schema.Types.ObjectId, ref: 'Child', required: true, index: true },
    center: { type: Schema.Types.ObjectId, ref: 'Center', required: true, index: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD, indexed for fast "today" queries
    status: { type: String, enum: ['present', 'absent', 'late', 'excused'], required: true },
    checkInTime: { type: String, default: null }, // HH:mm
    method: { type: String, enum: ['manual', 'qr_scan'], default: 'manual' },
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
    },
    locationAddress: {
      readableAddress: String,
      district: String,
      sector: String,
      cell: String,
      village: String,
    },
    // Offline-first: client generates this so retried/duplicate syncs can be deduped
    clientRecordId: { type: String, index: true, sparse: true },
  },
  { timestamps: true }
)

attendanceSchema.index({ child: 1, date: 1 }, { unique: true })

export default mongoose.model('Attendance', attendanceSchema)
