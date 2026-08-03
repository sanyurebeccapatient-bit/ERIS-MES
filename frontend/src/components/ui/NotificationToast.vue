<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Queue of incoming notifications to display one at a time
const queue = ref([])
const visible = ref(false)
const current = ref(null)
const leaving = ref(false)
let dismissTimer = null
const DISPLAY_DURATION = 4000
const ANIM_DURATION = 300

// Icon paths per notification type
const typeIcons = {
  health: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  visit: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
  report: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  alert: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  system: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
}

const typeBg = {
  health: 'bg-danger-500',
  visit: 'bg-accent-500',
  report: 'bg-warning-500',
  alert: 'bg-danger-500',
  system: 'bg-primary-500',
}

function showNext() {
  if (queue.value.length === 0) {
    current.value = null
    visible.value = false
    return
  }
  current.value = queue.value.shift()
  leaving.value = false
  visible.value = true

  // Vibrate on Android (like WhatsApp)
  try {
    if (navigator.vibrate) navigator.vibrate(200)
  } catch { /* no-op */ }

  // Auto dismiss after display duration
  clearTimeout(dismissTimer)
  dismissTimer = setTimeout(dismiss, DISPLAY_DURATION)
}

function dismiss() {
  clearTimeout(dismissTimer)
  leaving.value = true
  setTimeout(() => {
    visible.value = false
    // Show next in queue after exit animation
    nextTick(showNext)
  }, ANIM_DURATION)
}

function handleTap() {
  dismiss()
  // Navigate to notifications if the user taps the toast
  const route = current.value?.data?.route
  if (route) {
    router.push(route)
  } else {
    router.push({ name: 'notifications' })
  }
}

// Listen for push-notification events from Capacitor / service worker
function onPushNotification(event) {
  const data = event.detail || event.data || {}
  queue.value.push({
    title: data.title || 'New notification',
    body: data.body || '',
    type: data.type || 'system',
    data,
  })
  // If nothing is currently showing, start the queue
  if (!visible.value && !leaving.value) {
    showNext()
  }
}

onMounted(() => {
  window.addEventListener('push-notification', onPushNotification)
})

onUnmounted(() => {
  window.removeEventListener('push-notification', onPushNotification)
  clearTimeout(dismissTimer)
})

// Expose a way for the App.vue to programmatically push notifications
defineExpose({ push: (n) => { queue.value.push(n); if (!visible.value && !leaving.value) showNext() } })
</script>

<template>
  <!-- Toast container: fixed at top, WhatsApp-style slide-down -->
  <Teleport to="body">
    <Transition name="notif-toast">
      <div
        v-if="visible && current"
        class="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
        :class="{ 'animate-out': leaving }"
      >
        <div
          class="mx-3 mt-2 rounded-b-2xl shadow-xl overflow-hidden pointer-events-auto cursor-pointer active:scale-[0.98] transition-transform"
          style="background: #1F2937;"
          @click="handleTap"
        >
          <div class="flex items-start gap-3 px-4 py-3">
            <!-- Type icon -->
            <span
              class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              :class="typeBg[current.type] || 'bg-primary-500'"
            >
              <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" :d="typeIcons[current.type] || typeIcons.system" />
              </svg>
            </span>

            <!-- Content -->
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-white leading-tight">{{ current.title }}</p>
              <p v-if="current.body" class="text-xs text-gray-300 mt-1 leading-relaxed line-clamp-2">{{ current.body }}</p>
              <p class="text-[0.625rem] text-gray-500 mt-1">ERIS MES · now</p>
            </div>

            <!-- Dismiss button -->
            <button
              class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 -mt-0.5 text-gray-400 active:bg-white/10"
              @click.stop="dismiss"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.notif-toast-enter-active {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;
}
.notif-toast-leave-active {
  transition: transform 0.25s cubic-bezier(0.55, 0, 1, 0.45), opacity 0.25s ease;
}
.notif-toast-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}
.notif-toast-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
.animate-out {
  animation: slideUp 0.25s cubic-bezier(0.55, 0, 1, 0.45) forwards;
}
@keyframes slideUp {
  to {
    transform: translateY(-100%);
    opacity: 0;
  }
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
