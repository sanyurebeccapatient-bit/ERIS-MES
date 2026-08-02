<script setup>
import { onMounted } from 'vue'
import { refreshKey } from '@/i18n/index.js'

onMounted(async () => {
  // Service worker registration is handled once in main.js via
  // vite-plugin-pwa's virtual:pwa-register module (which points at the
  // correctly built/hashed service worker with the Workbox manifest
  // injected). Registering '/sw.js' directly here as well used to create a
  // second, conflicting registration pointing at the raw unbuilt source
  // file, which could fail silently and prevent the PWA install prompt
  // from ever becoming available — so that call has been removed.

  // Initialize push notifications
  try {
    const { initPushNotifications } = await import('@/services/pushNotifications.js')
    await initPushNotifications()
  } catch { /* non-critical */ }
})
</script>

<template>
  <router-view :key="refreshKey" />
</template>
