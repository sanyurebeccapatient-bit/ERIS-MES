<script setup>
import { onMounted, ref } from 'vue'
import { refreshKey } from '@/i18n/index.js'
import { useDashboardStore } from '@/stores/dashboard'
import { useAuthStore } from '@/stores/auth'
import NotificationToast from '@/components/ui/NotificationToast.vue'

const toastRef = ref(null)

onMounted(async () => {
  const dashboardStore = useDashboardStore()
  const authStore = useAuthStore()

  // Attach the live notification-refresh listener (re-fetches from server
  // whenever a push arrives, so the badge count stays accurate)
  dashboardStore.ensureRefreshListener()

  // Initialize push notifications (Capacitor FCM or Web Push)
  try {
    const { initPushNotifications } = await import('@/services/pushNotifications.js')
    await initPushNotifications()
  } catch { /* non-critical */ }

  // Wire push-notification events to both the toast and the store
  function onPushNotification(event) {
    const data = event.detail || {}
    // Show toast
    if (toastRef.value) {
      toastRef.value.push(data)
    }
    // Update store immediately for live badge count
    if (authStore.isAuthenticated) {
      dashboardStore.prependNotification(data)
    }
  }
  window.addEventListener('push-notification', onPushNotification)
})
</script>

<template>
  <router-view :key="refreshKey" />
  <NotificationToast ref="toastRef" />
</template>
