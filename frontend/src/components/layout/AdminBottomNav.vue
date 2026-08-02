<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseModal from '@/components/ui/BaseModal.vue'

const route = useRoute()
const router = useRouter()
const showMore = ref(false)

// The 4 primary destinations sit directly on the bar; everything else lives
// behind the center "more" button, matching the caregiver app's FAB slot.
const primaryItems = [
  {
    name: 'admin-dashboard',
    label: 'Overview',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    name: 'admin-caregivers',
    label: 'Caregivers',
    icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4',
  },
  { name: 'MORE' },
  {
    name: 'admin-reports',
    label: 'Reports',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    name: 'admin-alerts',
    label: 'Alerts',
    icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  },
]

// Full link list shown in the "more" sheet — includes the primary items too
// so every admin destination is reachable from one place, plus the ones
// that don't fit on the bar itself.
const allLinks = [
  { name: 'admin-dashboard', label: 'Overview', hint: 'KPIs and activity at a glance', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { name: 'admin-caregivers', label: 'Caregivers', hint: 'Manage users and roles', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4' },
  { name: 'admin-centers', label: 'Centers', hint: 'Locations and managers', icon: 'M3 21h18M5 21V7l8-4v18M19 21V11l-6-4' },
  { name: 'admin-reports', label: 'Reports', hint: 'Field visit submissions', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { name: 'admin-alerts', label: 'Health alerts', hint: 'Active flags across centers', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' },
  { name: 'admin-notifications', label: 'Notifications', hint: 'Send and manage notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { name: 'admin-audit', label: 'Audit log', hint: 'System activity history', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
]

const isMoreActive = computed(() =>
  ['admin-centers', 'admin-audit', 'admin-notifications'].includes(route.name)
)

function go(name) {
  showMore.value = false
  router.push({ name })
}
</script>

<template>
  <nav
    class="fixed bottom-0 left-0 right-0 z-40 bg-surface-raised border-t border-border safe-area-bottom shadow-nav-top md:hidden"
    aria-label="Admin navigation"
  >
    <div class="grid grid-cols-5 items-end">
      <template v-for="item in primaryItems" :key="item.name">
        <button
          v-if="item.name === 'MORE'"
          class="relative -top-5 flex flex-col items-center justify-self-center"
          aria-label="More admin links"
          @click="showMore = true"
        >
          <span
            class="w-14 h-14 rounded-full flex items-center justify-center shadow-raised active:scale-95 transition-transform"
            :class="isMoreActive ? 'bg-primary-500' : 'bg-accent-400'"
          >
            <svg class="w-7 h-7" :class="isMoreActive ? 'text-white' : 'text-ink'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.25">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </span>
        </button>
        <button
          v-else
          class="flex flex-col items-center justify-center gap-0.5 py-2.5 touch-target"
          :class="route.name === item.name ? 'text-primary-500' : 'text-ink-faint'"
          @click="router.push({ name: item.name })"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
          </svg>
          <span class="text-[0.6875rem] font-medium leading-none">{{ item.label }}</span>
        </button>
      </template>
    </div>
  </nav>

  <!-- "More" sheet: drops up from the hamburger button with every admin link -->
  <BaseModal v-model="showMore" title="Admin menu" size="md">
    <div class="space-y-1.5 -mx-1">
      <button
        v-for="link in allLinks"
        :key="link.name"
        class="w-full flex items-center gap-3 p-3 rounded-xl active:bg-surface-sunken/60 transition-colors"
        :class="route.name === link.name ? 'bg-primary-500/10' : ''"
        @click="go(link.name)"
      >
        <span
          class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          :class="route.name === link.name ? 'bg-primary-500 text-white' : 'bg-surface-sunken text-ink-soft'"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" :d="link.icon" />
          </svg>
        </span>
        <span class="min-w-0 flex-1 text-left">
          <span class="block text-sm font-medium" :class="route.name === link.name ? 'text-primary-600' : 'text-ink'">{{ link.label }}</span>
          <span class="block text-xs text-ink-faint truncate">{{ link.hint }}</span>
        </span>
        <svg class="w-4 h-4 text-ink-faint flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </BaseModal>
</template>
