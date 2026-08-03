import dotenv from 'dotenv'
dotenv.config()

function required(name, fallback = undefined) {
  const val = process.env[name] ?? fallback
  if (val === undefined) {
    console.warn(`[env] Missing environment variable: ${name}. Using empty string — set this in .env for production.`)
    return ''
  }
  return val
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),

  MONGO_URI: required('MONGO_URI', 'mongodb://127.0.0.1:27017/ecd_platform'),

  JWT_SECRET: required('JWT_SECRET', 'dev-secret-change-me'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://eris-mes.vercel.app',

  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  MAX_UPLOAD_MB: parseInt(process.env.MAX_UPLOAD_MB || '8', 10),

  // Cloudinary — set these to enable cloud image storage for uploaded
  // photos (children, reports, visits, health alerts, avatars). All three
  // are required together; if any is missing, image uploads will fail
  // with a clear error instead of silently falling back to disk.
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  CLOUDINARY_UPLOAD_FOLDER: process.env.CLOUDINARY_UPLOAD_FOLDER || 'eris-mes',

  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:admin@example.org',

  // Firebase Cloud Messaging — for native Android/iOS push via FCM.
  // Set FIREBASE_PROJECT_ID (or provide FIREBASE_SERVICE_ACCOUNT_JSON with
  // the full JSON string from the Firebase console → Service Accounts).
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
}

export const isProd = env.NODE_ENV === 'production'
