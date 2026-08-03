<script setup>
import AdminSidebar from './AdminSidebar.vue'
import AdminBottomNav from './AdminBottomNav.vue'
import { useSwipeNav } from '@/composables/useSwipeNav.js'

const adminRoutes = [
  'admin-dashboard',
  'admin-caregivers',
  'admin-reports',
  'admin-alerts',
]
useSwipeNav(adminRoutes)
</script>

<template>
  <div class="flex min-h-screen bg-surface">
    <AdminSidebar />
    <div class="flex-1 min-w-0 pb-24 md:pb-0">
      <router-view />
      <AdminBottomNav />
    </div>
  </div>
</template>
