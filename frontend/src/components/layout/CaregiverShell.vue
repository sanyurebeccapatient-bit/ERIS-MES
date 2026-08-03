<script setup>
import { onMounted, computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import BottomNav from './BottomNav.vue'
import AppTopBar from './AppTopBar.vue'
import TransitionWrapper from './TransitionWrapper.vue'
import { useSyncStore } from '@/stores/sync'
import { useDashboardStore } from '@/stores/dashboard'
import { refreshKey, useI18n } from '@/i18n/index.js'
import { useSwipeNav } from '@/composables/useSwipeNav.js'

const syncStore = useSyncStore()
const dashboardStore = useDashboardStore()
const localeKey = refreshKey
const route = useRoute()
const { t } = useI18n()

const showBottomNav = computed(() => route.name !== 'new-report')

// Shared top bar: stays fixed in place while the page content below it
// slides — only its title text changes per route (WhatsApp-style tabs).
// Views that manage their own top bar (e.g. the multi-step new-report
// flow) simply omit `meta.topbar` and keep rendering their own.
const topbarMeta = computed(() => route.meta?.topbar)

// WhatsApp-style swipe navigation between caregiver pages
const caregiverRoutes = [
  'caregiver-dashboard',
  'children',
  'visits',
  'notifications',
]
// Only this container slides — the top bar and bottom nav live outside it.
const slideEl = ref(null)
useSwipeNav(caregiverRoutes, slideEl)

onMounted(() => {
  syncStore.init()
  if (!dashboardStore.notifications.length) dashboardStore.loadNotifications()
})
</script>

<template>
  <div class="min-h-screen bg-surface md:pl-20" :class="showBottomNav ? 'pb-24 md:pb-0' : ''">
    <AppTopBar
      v-if="topbarMeta"
      :key="'topbar-' + localeKey"
      :title="t(topbarMeta.titleKey)"
      :show-back="!!topbarMeta.showBack"
    />
    <div ref="slideEl" class="relative overflow-x-hidden will-change-transform">
      <TransitionWrapper :route-order="caregiverRoutes" />
    </div>
    <BottomNav v-if="showBottomNav" :key="'bottomnav-' + localeKey" />
  </div>
</template>
