<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AdminSidebar from './AdminSidebar.vue'
import AdminBottomNav from './AdminBottomNav.vue'
import AdminTopBar from './AdminTopBar.vue'
import TransitionWrapper from './TransitionWrapper.vue'
import { useSwipeNav } from '@/composables/useSwipeNav.js'

const route = useRoute()

// Shared top bar: stays fixed while page content slides beneath it —
// only the title changes per route. Same pattern as CaregiverShell.
const topbarMeta = computed(() => route.meta?.topbar)

const adminRoutes = [
  'admin-dashboard',
  'admin-caregivers',
  'admin-reports',
  'admin-alerts',
]
// Only this container slides — the top bar and bottom nav live outside it.
const slideEl = ref(null)
useSwipeNav(adminRoutes, slideEl)
</script>

<template>
  <div class="flex min-h-screen bg-surface">
    <AdminSidebar />
    <div class="flex-1 min-w-0 pb-24 md:pb-0 relative">
      <AdminTopBar v-if="topbarMeta" :title="topbarMeta.title" />
      <div ref="slideEl" class="relative overflow-x-hidden will-change-transform">
        <TransitionWrapper :route-order="adminRoutes" />
      </div>
      <AdminBottomNav />
    </div>
  </div>
</template>
