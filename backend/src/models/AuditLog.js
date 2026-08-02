import mongoose from 'mongoose'
const { Schema } = mongoose

const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, index: true }, // e.g. 'user.role_change', 'child.delete', 'report.approve'
    entity: {
      kind: { type: String, default: null },
      id: { type: Schema.Types.ObjectId, default: null },
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: null },
  },
  { timestamps: true }
)

export default mongoose.model('AuditLog', auditLogSchema)
