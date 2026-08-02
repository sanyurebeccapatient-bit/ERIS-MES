import EmergencyContact from '../models/EmergencyContact.js'
import { asyncHandler } from '../utils/asyncHandler.js'

/** GET /api/emergency-contacts */
export const listEmergencyContacts = asyncHandler(async (req, res) => {
  const filter = { $or: [{ center: null }] }
  if (req.user.center) filter.$or.push({ center: req.user.center })

  const contacts = await EmergencyContact.find(filter).sort({ type: 1 })
  res.json(contacts)
})
