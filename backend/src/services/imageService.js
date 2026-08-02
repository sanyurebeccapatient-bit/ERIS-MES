import sharp from 'sharp'
import { v2 as cloudinary } from 'cloudinary'
import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'

const cloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
)

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  })
} else {
  console.warn(
    '[imageService] Cloudinary is not configured — set CLOUDINARY_CLOUD_NAME, ' +
    'CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env. Photo uploads will fail until this is set.'
  )
}

/**
 * Uploads an already-processed image buffer to Cloudinary via its upload
 * stream API, under `${CLOUDINARY_UPLOAD_FOLDER}/${subfolder}`. Resolves
 * with the Cloudinary upload result (we only use its secure_url).
 */
function uploadBufferToCloudinary(buffer, subfolder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${env.CLOUDINARY_UPLOAD_FOLDER}/${subfolder}`,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error)
        resolve(result)
      }
    )
    stream.end(buffer)
  })
}

function assertConfigured() {
  if (!cloudinaryConfigured) {
    throw new AppError(
      'Image uploads are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the backend .env file.',
      500
    )
  }
}

/**
 * Processes an in-memory image buffer: resizes to a sane max dimension,
 * strips EXIF/GPS metadata for privacy, converts to JPEG, then uploads the
 * result to Cloudinary. Returns the public HTTPS URL Cloudinary serves the
 * image from — this is stored directly on the record and rendered as-is
 * on the frontend (resolveMediaUrl already passes absolute https:// URLs
 * straight through, no other change needed there).
 *
 * @param {Buffer} buffer
 * @param {string} subfolder - e.g. 'children', 'reports', 'visits'
 * @returns {Promise<string>} absolute Cloudinary URL
 */
export async function processAndSaveImage(buffer, subfolder = 'misc') {
  assertConfigured()

  const processed = await sharp(buffer)
    .rotate() // auto-orient based on EXIF before stripping it
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer()

  const result = await uploadBufferToCloudinary(processed, subfolder)
  return result.secure_url
}

/** Generates a small thumbnail alongside the main image. Optional, used for list views. */
export async function processAndSaveThumbnail(buffer, subfolder = 'misc') {
  assertConfigured()

  const processed = await sharp(buffer)
    .rotate()
    .resize({ width: 200, height: 200, fit: 'cover' })
    .jpeg({ quality: 65 })
    .toBuffer()

  const result = await uploadBufferToCloudinary(processed, `${subfolder}/thumbs`)
  return result.secure_url
}
