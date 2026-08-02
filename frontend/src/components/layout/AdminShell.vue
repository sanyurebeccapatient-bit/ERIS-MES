<script setup>
import AdminSidebar from './AdminSidebar.vue'
import AdminBottomNav from './AdminBottomNav.vue'
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
