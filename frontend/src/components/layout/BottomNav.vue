<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n, refreshKey } from '@/i18n/index.js'
import { useDashboardStore } from '@/stores/dashboard'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const localeKey = refreshKey
const dashboardStore = useDashboardStore()

const alertsCount = computed(() => dashboardStore.unreadNotificationsCount)
const alertsBadge = computed(() => (alertsCount.value > 9 ? '9+' : String(alertsCount.value)))

const items = computed(() => [
  {
    name: 'caregiver-dashboard',
    label: t('nav.home'),
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    name: 'children',
    label: t('nav.children'),
    icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4',
  },
  { name: 'FAB' },
  {
    name: 'visits',
    label: t('nav.visits'),
    icon: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    name: 'notifications',
    label: t('nav.alerts'),
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  },
])
</script>

<template>
  <nav
    class="fixed bottom-0 left-0 right-0 z-40 bg-surface-raised border-t border-border safe-area-bottom shadow-nav-top md:hidden"
    aria-label="Primary navigation"
  >
    <div class="grid grid-cols-5 items-end">
      <template v-for="item in items" :key="item.name + '-' + localeKey">
        <button
          v-if="item.name === 'FAB'"
          class="relative -top-5 flex flex-col items-center justify-self-center"
          :aria-label="t('nav.newReport')"
          @click="router.push({ name: 'new-report' })"
        >
          <span class="w-14 h-14 rounded-full bg-accent-400 flex items-center justify-center shadow-raised active:scale-95 transition-transform">
            <svg class="w-7 h-7 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.25">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </span>
        </button>
        <button
          v-else
          class="flex flex-col items-center justify-center gap-0.5 py-2.5 touch-target"
          :class="route.name === item.name ? 'text-primary-500' : 'text-ink-faint'"
          @click="router.push({ name: item.name })"
        >
          <span class="relative">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
            </svg>
            <span
              v-if="item.name === 'notifications' && alertsCount > 0"
              class="absolute -top-1 -right-2 min-w-[1.05rem] h-[1.05rem] px-[3px] rounded-full bg-danger-500 text-white text-[0.625rem] font-semibold leading-none flex items-center justify-center"
            >
              {{ alertsBadge }}
            </span>
          </span>
          <span class="text-[0.6875rem] font-medium leading-none">{{ item.label }}</span>
        </button>
      </template>
    </div>
  </nav>
</template>
