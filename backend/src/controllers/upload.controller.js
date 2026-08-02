import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/AppError.js'
import { processAndSaveImage } from '../services/imageService.js'

/**
 * POST /api/upload/photo
 * Generic single-photo upload used by report/visit/health-alert forms.
 * Field name: 'photo'. Optional 'context' field (e.g. 'reports', 'visits')
 * controls which subfolder it's stored under — kept separate from any
 * "background image" or design-asset upload endpoints to avoid the kind
 * of picker cross-contamination seen in CardNova's designer.
 */
export const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No photo provided', 400)
  const context = ['reports', 'visits', 'health', 'children'].includes(req.body.context)
    ? req.body.context
    : 'misc'

  const url = await processAndSaveImage(req.file.buffer, context)
  res.status(201).json({ url })
})

/** POST /api/upload/avatar — separate endpoint, separate folder, on purpose. */
export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No photo provided', 400)
  const url = await processAndSaveImage(req.file.buffer, 'avatars')
  res.status(201).json({ url })
})
