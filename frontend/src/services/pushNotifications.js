/**
 * Push Notification Service
 * -----------------------------------------------------------------------
 * Handles both Web Push (browser) and Capacitor Push (Android/iOS).
 *
 * IMPORTANT: This file does NOT import from `@capacitor/push-notifications`
 * because that package may not be installed during browser dev. Instead, it
 * accesses the plugin through `window.Capacitor.Plugins.PushNotifications`
 * which is registered by the native bridge at runtime — no npm import needed.
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
    PushNotifications.addListener('registration', async (token) => {
      try {
        const { apiClient } = await import('./api/client.js')
        await apiClient.post('/notifications/subscribe', {
          token: token.value,
          platform: 'android',
        })
      } catch {
        // Non-critical
      }
    })

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      // Dispatch to UI layer
      window.dispatchEvent(new CustomEvent('push-notification', {
        detail: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
        },
      }))
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      const data = notification.notification?.data || {}
      if (data.route) {
        const router = window.__vue_router__
        if (router) router.push(data.route)
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
