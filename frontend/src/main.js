import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import { bindGlobalListeners as bindPwaInstallListeners } from '@/composables/usePwaInstall.js'

// Bind the 'beforeinstallprompt'/'appinstalled' listeners as early as
// possible — before Vue even mounts — so the event isn't missed if it
// fires before the user navigates to a view that uses usePwaInstall().
bindPwaInstallListeners()

// Restore persisted dark mode preference before mount to avoid a flash
if (localStorage.getItem('ecd_dark_mode') === '1') {
  document.documentElement.classList.add('dark')
}

// Initialize i18n
import './i18n/index.js'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Expose router for push notification deep-linking
if (typeof window !== 'undefined') {
  window.__vue_router__ = router
}

app.mount('#app')

// Post-mount: initialize non-critical services
if (typeof window !== 'undefined') {
  // Disable pull-to-refresh and overscroll bounce on mobile
  document.body.style.overscrollBehaviorY = 'none'
  document.documentElement.style.overscrollBehavior = 'none'

  // Initialize push notifications (non-blocking) — moved to App.vue
  // so it runs after auth restoration and can wire to the store.

  // Start offline sync engine after auth is restored
  import('./services/offline/syncEngine.js').then(({ startAutoSync }) => {
    // Delay to allow auth restoration
    setTimeout(() => {
      startAutoSync(30000)
    }, 2000)
  }).catch(() => {})

  // Register service worker via vite-plugin-pwa's virtual module. This
  // resolves to the actual built/hashed service worker output (with
  // self.__WB_MANIFEST correctly injected), unlike a hand-written
  // navigator.serviceWorker.register('/sw.js') which points at the raw,
  // unbuilt source file and fails silently (the source uses ES `import`
  // syntax and an undefined __WB_MANIFEST placeholder, so the browser
  // rejects the script and no service worker ever activates — which in
  // turn means the install-app prompt/button never becomes available).
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  }).catch(() => {})
}
