import { ref, onMounted, onBeforeUnmount } from 'vue'

// Module-level state so every component that uses this composable shares
// the same deferred prompt and install status (the browser only fires
// beforeinstallprompt once per page load).
const deferredPrompt = ref(null)
const isInstallable = ref(false)
const isInstalled = ref(false)
const installing = ref(false)

function detectStandalone() {
  if (typeof window === 'undefined') return false
  const displayModeStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches
  // iOS Safari exposes this non-standard flag when launched from the home screen
  const iosStandalone = window.navigator?.standalone === true
  return Boolean(displayModeStandalone || iosStandalone)
}

let listenersBound = false

// Exported so main.js can call this once, eagerly, as soon as the app boots
// — rather than only when LoginView (the only prior caller of
// usePwaInstall()) happens to mount. The browser fires
// 'beforeinstallprompt' once per page load, often very early; if nothing
// is listening yet when it fires, the event is lost for the rest of that
// page load and the install button/prompt never becomes available.
export function bindGlobalListeners() {
  if (listenersBound || typeof window === 'undefined') return
  listenersBound = true

  isInstalled.value = detectStandalone()

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e
    isInstallable.value = !isInstalled.value
  })

  window.addEventListener('appinstalled', () => {
    isInstalled.value = true
    isInstallable.value = false
    deferredPrompt.value = null
  })

  // Some browsers update display-mode without firing appinstalled reliably
  window.matchMedia?.('(display-mode: standalone)')?.addEventListener?.('change', (e) => {
    if (e.matches) {
      isInstalled.value = true
      isInstallable.value = false
    }
  })
}

export function usePwaInstall() {
  bindGlobalListeners()

  onMounted(() => {
    isInstalled.value = detectStandalone()
  })

  async function promptInstall() {
    if (!deferredPrompt.value) return { outcome: 'unavailable' }
    installing.value = true
    try {
      deferredPrompt.value.prompt()
      const choice = await deferredPrompt.value.userChoice
      if (choice.outcome === 'accepted') {
        isInstalled.value = true
        isInstallable.value = false
      }
      deferredPrompt.value = null
      return choice
    } finally {
      installing.value = false
    }
  }

  return { isInstallable, isInstalled, installing, promptInstall }
}
