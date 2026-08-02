import multer from 'multer'
import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'

const storage = multer.memoryStorage() // we process with sharp before writing to disk

function fileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  if (!allowed.includes(file.mimetype)) {
    return cb(new AppError('Only image files (JPEG, PNG, WebP, HEIC) are allowed', 400))
  }
  cb(null, true)
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
})
