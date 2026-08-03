/**
 * Push Notification Service
 * -----------------------------------------------------------------------
 * Handles both Web Push (browser/PWA) and Capacitor FCM (Android/iOS).
 *
 * For native devices the Capacitor PushNotifications plugin provides
 * the FCM registration token which we send to the backend so it can
 * deliver notifications via firebase-admin.
 *
 * For browsers we use the standard Web Push API with VAPID keys.
 *
 * IMPORTANT: This file does NOT import from `@capacitor/push-notifications`
 * because that package may not be installed during browser dev. Instead, it
 * accesses the plugin through `window.Capacitor.Plugins.PushNotifications`
 * which is registered by the native bridge at runtime.
 * -----------------------------------------------------------------------
 */

let VAPID_PUBLIC_KEY = ''

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/** Detect if running inside Capacitor native shell */
function isCapacitorNative() {
  try {
    return window.Capacitor?.isNativePlatform?.() === true
  } catch {
    return false
  }
}

/** Get the PushNotifications plugin from the Capacitor bridge (no npm import). */
function getPushPlugin() {
  try {
    return window.Capacitor?.Plugins?.PushNotifications || null
  } catch {
    return null
  }
}

/** Request notification permission from the user. */
export async function requestPermission() {
  if (isCapacitorNative()) {
    try {
      const PushNotifications = getPushPlugin()
      if (!PushNotifications) return 'denied'
      const result = await PushNotifications.requestPermissions()
      return result.receive === 'granted' ? 'granted' : 'denied'
    } catch {
      return 'denied'
    }
  }
  if (!('Notification' in window)) return 'denied'
  const result = await Notification.requestPermission()
  return result
}

/** Subscribe to push notifications (Web Push or Capacitor). */
export async function subscribe() {
  if (isCapacitorNative()) {
    return subscribeCapacitor()
  }
  return subscribeWebPush()
}

async function subscribeCapacitor() {
  const PushNotifications = getPushPlugin()
  if (!PushNotifications) return

  try {
    // Create the Android notification channel (WhatsApp-style channel)
    try {
      await PushNotifications.createChannel({
        id: 'eris_messages',
        name: 'Messages',
        description: 'Notifications from ERIS MES',
        importance: 4, // HIGH
        visibility: 1, // PUBLIC
        sound: 'default',
        vibration: true,
      })
    } catch {
      // Channel may already exist — non-critical
    }

    PushNotifications.addListener('registration', async (token) => {
      try {
        const { apiClient } = await import('./api/client.js')
        // Send as FCM token with platform info
        await apiClient.post('/notifications/subscribe', {
          token: token.value,
          platform: 'android',
        })
        console.log('[push] FCM token registered')
      } catch {
        // Non-critical
      }
    })

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[push] Foreground notification:', notification.title)

      // Dispatch to UI layer for the toast component
      window.dispatchEvent(new CustomEvent('push-notification', {
        detail: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          type: notification.data?.type || 'system',
        },
      }))

      // Also trigger a store refresh so the badge count updates immediately
      window.dispatchEvent(new CustomEvent('notification-refresh'))
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      const data = notification.notification?.data || {}
      const router = window.__vue_router__
      if (router) {
        if (data.route) {
          router.push(data.route)
        } else {
          router.push({ name: 'notifications' })
        }
      }
    })

    await PushNotifications.register()
  } catch {
    // Push not available in this environment
  }
}

async function subscribeWebPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null

  const registration = await navigator.serviceWorker.ready

  let subscription
  try {
    subscription = await registration.pushManager.getSubscription()
  } catch { /* no existing subscription */ }

  if (!subscription) {
    const options = VAPID_PUBLIC_KEY
      ? { applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY), userVisibleOnly: true }
      : { userVisibleOnly: true }
    subscription = await registration.pushManager.subscribe(options)
  }

  try {
    const { apiClient } = await import('./api/client.js')
    await apiClient.post('/notifications/subscribe', subscription.toJSON())
  } catch {
    // Non-critical
  }

  return subscription
}

/** Set up a listener for incoming push messages via the service worker. */
export function listenForMessages() {
  if (!('serviceWorker' in navigator)) return

  navigator.serviceWorker.addEventListener('message', (event) => {
    const { type, data } = event.data || {}
    if (type === 'PUSH_NOTIFICATION') {
      window.dispatchEvent(new CustomEvent('push-notification', { detail: data }))
      // Also trigger a store refresh
      window.dispatchEvent(new CustomEvent('notification-refresh'))
    }
  })
}

/**
 * Initialize push notifications: request permission, subscribe, listen.
 */
export async function initPushNotifications() {
  try {
    const permission = await requestPermission()
    if (permission !== 'granted') return
    await subscribe()
    if (!isCapacitorNative()) listenForMessages()
  } catch {
    // Push init failed silently — non-critical feature
  }
}

/** Set VAPID key (called from main.js with env config) */
export function setVapidPublicKey(key) {
  VAPID_PUBLIC_KEY = key
}
