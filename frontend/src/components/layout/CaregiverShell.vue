<script setup>
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import BottomNav from './BottomNav.vue'
import TransitionWrapper from './TransitionWrapper.vue'
import { useSyncStore } from '@/stores/sync'
import { useDashboardStore } from '@/stores/dashboard'
import { refreshKey } from '@/i18n/index.js'
import { useSwipeNav } from '@/composables/useSwipeNav.js'

const syncStore = useSyncStore()
const dashboardStore = useDashboardStore()
const localeKey = refreshKey
const route = useRoute()

const showBottomNav = computed(() => route.name !== 'new-report')

// WhatsApp-style swipe navigation between caregiver pages
const caregiverRoutes = [
  'caregiver-dashboard',
  'children',
  'visits',
  'notifications',
]
useSwipeNav(caregiverRoutes)

onMounted(() => {
  syncStore.init()
  if (!dashboardStore.notifications.length) dashboardStore.loadNotifications()
})
</script>

<template>
  <div class="min-h-screen bg-surface md:pl-20" :class="showBottomNav ? 'pb-24 md:pb-0' : ''">
    <TransitionWrapper />
    <BottomNav v-if="showBottomNav" :key="'bottomnav-' + localeKey" />
  </div>
</template>
