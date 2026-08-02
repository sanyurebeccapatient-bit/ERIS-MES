<script setup>
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import BottomNav from './BottomNav.vue'
import { useSyncStore } from '@/stores/sync'
import { useDashboardStore } from '@/stores/dashboard'
import { refreshKey } from '@/i18n/index.js'

const syncStore = useSyncStore()
const dashboardStore = useDashboardStore()
const localeKey = refreshKey
const route = useRoute()

// The New report flow renders its own full-width sticky Back/Next/Submit bar
// pinned to the bottom of the screen. Showing BottomNav at the same time
// would visually stack two fixed bottom bars and hide the step actions
// behind the nav, so BottomNav is hidden while on that route.
const showBottomNav = computed(() => route.name !== 'new-report')

onMounted(() => {
  syncStore.init()
  // Populate unread-alerts badge as soon as the shell mounts, not just when
  // the dashboard or notifications page happens to load it.
  if (!dashboardStore.notifications.length) dashboardStore.loadNotifications()
})
</script>

<template>
  <div class="min-h-screen bg-surface md:pl-20" :class="showBottomNav ? 'pb-24 md:pb-0' : ''">
    <router-view :key="localeKey" />
    <BottomNav v-if="showBottomNav" :key="'bottomnav-' + localeKey" />
  </div>
</template>
