import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * Tracks browser online/offline status reactively.
 * navigator.onLine can be unreliable on some devices, so `probe()` is
 * provided to force a real network check (small no-cache fetch).
 */
export function useOnlineStatus() {
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const checking = ref(false)

  function handleOnline() {
    isOnline.value = true
  }
  function handleOffline() {
    isOnline.value = false
  }

  async function probe() {
    checking.value = true
    try {
      if (!navigator.onLine) {
        isOnline.value = false
        return false
      }
      // Small, cache-busted request to confirm real connectivity,
      // not just an interface being "up".
      await fetch('/favicon.svg', { method: 'HEAD', cache: 'no-store' })
      isOnline.value = true
      return true
    } catch {
      isOnline.value = false
      return false
    } finally {
      checking.value = false
    }
  }

  onMounted(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  return { isOnline, checking, probe }
}
