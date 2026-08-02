import { Router } from 'express'
import { uploadPhoto, uploadAvatar } from '../controllers/upload.controller.js'
import { requireAuth } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'

const router = Router()
router.use(requireAuth)

// Dedicated fields — 'photo' for reports/visits/health evidence, kept
// separate from any future designer/background-image upload endpoint.
router.post('/photo', upload.single('photo'), uploadPhoto)
router.post('/avatar', upload.single('photo'), uploadAvatar)

export default router
