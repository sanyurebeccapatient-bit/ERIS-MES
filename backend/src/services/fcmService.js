import admin from 'firebase-admin'
import { env } from '../config/env.js'

let fcmReady = false

/**
 * Initialise firebase-admin once using service-account credentials from
 * environment variables.  Safe to call multiple times — subsequent calls
 * are no-ops.
 */
function ensureInitialized() {
  if (fcmReady) return true
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_PRIVATE_KEY || !env.FIREBASE_CLIENT_EMAIL) {
    return false
  }
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          privateKey: env.FIREBASE_PRIVATE_KEY,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
        }),
      })
    }
    fcmReady = true
    return true
  } catch (err) {
    console.error('[fcm] Failed to initialise firebase-admin:', err.message)
    return false
  }
}

/**
 * Send a push notification to a single FCM device token.
 * Returns true if sent, false otherwise.
 */
export async function sendFcm(token, { title, body, data = {} }) {
  if (!ensureInitialized()) return false

  const message = {
    token,
    notification: { title, body },
    data: {
      // FCM data values must be strings
      ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v ?? '')])),
      // Always include the notification type for client-side routing
      type: data.type || 'system',
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'eris_messages',
        sound: 'default',
        priority: 'high',
        defaultSound: true,
        defaultVibrateTimings: true,
        smallIcon: 'ic_stat_icon',
        iconColor: '#0F6B5C',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  }

  try {
    await admin.messaging().send(message)
    return true
  } catch (err) {
    // Unregistered / invalid token — caller should prune it
    if (err.code === 'messaging/invalid-registration-token' ||
        err.code === 'messaging/registration-token-not-registered') {
      return 'invalid'
    }
    console.error('[fcm] send failed for token', token.slice(-8) + '…:', err.message)
    return false
  }
}

/**
 * Send a multicast message to up to 500 FCM tokens at once.
 * Returns { successCount, failureCount, invalidTokens }.
 */
export async function sendFcmMulticast(tokens, { title, body, data = {} }) {
  if (!tokens.length) return { successCount: 0, failureCount: 0, invalidTokens: [] }
  if (!ensureInitialized()) return { successCount: 0, failureCount: tokens.length, invalidTokens: [] }

  const message = {
    tokens,
    notification: { title, body },
    data: {
      ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v ?? '')])),
      type: data.type || 'system',
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'eris_messages',
        sound: 'default',
        priority: 'high',
        defaultSound: true,
        defaultVibrateTimings: true,
        smallIcon: 'ic_stat_icon',
        iconColor: '#0F6B5C',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  }

  try {
    const batchResponse = await admin.messaging().sendEachForMulticast(message)
    const invalidTokens = []
    batchResponse.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const err = resp.error
        if (err.code === 'messaging/invalid-registration-token' ||
            err.code === 'messaging/registration-token-not-registered') {
          invalidTokens.push(tokens[idx])
        }
      }
    })
    return {
      successCount: batchResponse.successCount,
      failureCount: batchResponse.failureCount,
      invalidTokens,
    }
  } catch (err) {
    console.error('[fcm] multicast failed:', err.message)
    return { successCount: 0, failureCount: tokens.length, invalidTokens: [] }
  }
}

/** Returns true if FCM is configured and initialised. */
export function isFcmReady() {
  return fcmReady
}
