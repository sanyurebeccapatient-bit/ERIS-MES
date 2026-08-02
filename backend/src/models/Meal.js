import mongoose from 'mongoose'
const { Schema } = mongoose

const mealSchema = new Schema(
  {
    child: { type: Schema.Types.ObjectId, ref: 'Child', required: true, index: true },
    center: { type: Schema.Types.ObjectId, ref: 'Center', required: true, index: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    type: { type: String, enum: ['breakfast', 'lunch', 'snack', 'dinner'], required: true },
    recorded: { type: Boolean, default: true },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
)

mealSchema.index({ child: 1, date: 1, type: 1 }, { unique: true })

export default mongoose.model('Meal', mealSchema)
