<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useAuthStore } from '@/stores/auth'
import { useOnlineStatus } from '@/composables/useOnlineStatus.js'
import { useI18n } from '@/i18n/index.js'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { t } = useI18n()
const { isOnline, checking, probe } = useOnlineStatus()

const reconnected = ref(false)
let pollTimer = null

const statusLabel = computed(() => {
  if (reconnected.value) return t('pwa.backOnline') || "You're back online. Loading your dashboard…"
  if (checking.value) return t('pwa.checking') || 'Checking connection…'
  return isOnline.value ? (t('pwa.checking') || 'Checking connection…') : ''
})

function goToDestination() {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect) {
    router.replace(redirect)
    return
  }
  if (authStore.isAuthenticated) {
    router.replace(authStore.isAdminRole ? { name: 'admin-dashboard' } : { name: 'caregiver-dashboard' })
  } else {
    router.replace({ name: 'login' })
  }
}

async function handleReconnected() {
  if (reconnected.value) return
  reconnected.value = true
  clearInterval(pollTimer)
  setTimeout(goToDestination, 700)
}

async function retry() {
  const online = await probe()
  if (online) await handleReconnected()
}

onMounted(() => {
  // Passive listener for the native browser event
  window.addEventListener('online', () => { probe().then((ok) => ok && handleReconnected()) })
  // Active polling as a fallback for devices where the online event is unreliable
  pollTimer = setInterval(async () => {
    const online = await probe()
    if (online) await handleReconnected()
  }, 4000)
  // Initial check in case connectivity is already back
  probe().then((ok) => ok && handleReconnected())
})

onBeforeUnmount(() => {
  clearInterval(pollTimer)
})
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-surface safe-area-top safe-area-bottom">
    <div class="w-20 h-20 rounded-full bg-danger-500/10 flex items-center justify-center mb-5">
      <svg class="w-9 h-9 text-danger-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12 20.25h.008v.008H12v-.008z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 3l18 18" />
      </svg>
    </div>

    <h1 class="font-display font-bold text-xl text-ink mb-1.5">
      {{ t('pwa.offlineTitle') || 'No internet connection' }}
    </h1>
    <p class="text-sm text-ink-soft max-w-xs mb-2">
      {{ t('pwa.offlineMessage') || "You're currently offline. Check your Wi-Fi or mobile data connection and try again." }}
    </p>
    <p class="text-xs text-ink-faint max-w-xs mb-7">
      {{ t('pwa.offlineTip') || "Any work you already saved is safe on this device and will sync automatically once you're back online." }}
    </p>

    <BaseButton variant="primary" :loading="checking" @click="retry">
      {{ t('pwa.retry') || 'Try again' }}
    </BaseButton>

    <div class="flex items-center gap-2 mt-6">
      <span
        class="w-2 h-2 rounded-full"
        :class="reconnected || isOnline ? 'bg-success-500' : 'bg-ink-faint'"
      />
      <span class="text-xs text-ink-faint">{{ statusLabel }}</span>
    </div>
  </div>
</template>
