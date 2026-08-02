<script setup>
import { useRoute, useRouter } from 'vue-router'
import SyncIndicator from '@/components/ui/SyncIndicator.vue'

const route = useRoute()
const router = useRouter()

const navItems = [
  { name: 'admin-dashboard', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { name: 'admin-caregivers', label: 'Caregivers', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4' },
  { name: 'admin-centers', label: 'Centers', icon: 'M3 21h18M5 21V7l8-4v18M19 21V11l-6-4' },
  { name: 'admin-reports', label: 'Reports', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { name: 'admin-alerts', label: 'Health alerts', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' },
  { name: 'admin-notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { name: 'admin-audit', label: 'Audit log', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
]
</script>

<template>
  <aside class="hidden md:flex md:flex-col w-64 bg-surface-raised border-r border-border h-screen sticky top-0">
    <div class="flex items-center gap-2.5 px-5 h-16 border-b border-border">
      <div class="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5" />
        </svg>
      </div>
      <div class="min-w-0">
        <p class="font-display font-semibold text-sm text-ink truncate">ERIS MES</p>
        <p class="text-xs text-ink-faint truncate">Admin console</p>
      </div>
    </div>

    <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      <button
        v-for="item in navItems"
        :key="item.name"
        class="w-full flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-medium transition-colors"
        :class="route.name === item.name ? 'bg-primary-500/10 text-primary-600' : 'text-ink-soft hover:bg-surface-sunken'"
        @click="router.push({ name: item.name })"
      >
        <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
        </svg>
        {{ item.label }}
      </button>
    </nav>

    <div class="px-4 py-3 border-t border-border flex items-center justify-between gap-2">
      <SyncIndicator />
      <button
        class="w-8 h-8 rounded-full bg-primary-500/10 text-primary-600 flex items-center justify-center flex-shrink-0"
        :class="route.name === 'admin-profile' ? 'ring-2 ring-primary-400' : ''"
        aria-label="Profile"
        @click="router.push({ name: 'admin-profile' })"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </button>
    </div>
  </aside>
</template>
