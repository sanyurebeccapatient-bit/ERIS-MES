<script setup>
import { onMounted, ref, computed } from 'vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useI18n, refreshKey } from '@/i18n/index.js'
import BaseCard from '@/components/ui/BaseCard.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const { t } = useI18n()
const dashboardStore = useDashboardStore()
const loading = ref(true)
const clearing = ref(false)
// Alerts page shows only admin-originated alerts — internal sync/self echoes
// (e.g. "attendance recorded") are excluded here.
const notifications = computed(() => dashboardStore.caregiverAlerts)

onMounted(async () => {
  try {
    await dashboardStore.loadNotifications()
  } finally {
    loading.value = false
  }
})

async function clearAlerts() {
  if (clearing.value || !notifications.value.length) return
  clearing.value = true
  try {
    await dashboardStore.clearAlerts()
  } finally {
    clearing.value = false
  }
}

const iconFor = {
  sync: { bg: 'bg-primary-500/10', color: 'text-primary-500', path: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  health: { bg: 'bg-danger-500/10', color: 'text-danger-500', path: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' },
  visit: { bg: 'bg-accent-400/15', color: 'text-accent-600', path: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z' },
}

function markRead(n) {
  if (n.read) return
  dashboardStore.markNotificationRead(n.id || n._id)
}

const unreadCount = computed(() => dashboardStore.unreadNotificationsCount)
const localeKey = refreshKey
</script>

<template>
  <div :key="'notif-' + localeKey">

    <main class="px-4 pt-4 space-y-4">
      <div v-if="!loading && notifications.length" class="flex items-center justify-between gap-3">
        <p v-if="unreadCount" class="text-xs font-medium text-ink-faint uppercase tracking-wide">
          {{ t('notifications.unread', { n: unreadCount }) }}
        </p>
        <span v-else />
        <button
          type="button"
          class="text-xs font-medium text-primary-500 py-1.5 px-2 -mr-2 disabled:opacity-50"
          :disabled="clearing"
          @click="clearAlerts"
        >
          {{ t('notifications.clearAll') }}
        </button>
      </div>

      <div v-if="loading" class="space-y-2.5">
        <SkeletonBlock v-for="i in 4" :key="i" height="4.5rem" rounded="rounded-card" />
      </div>

      <div v-else-if="notifications.length" class="space-y-2.5">
        <BaseCard
          v-for="n in notifications"
          :key="n.id"
          interactive
          class="flex items-start gap-3 relative overflow-hidden"
          @click="markRead(n)"
        >
          <span
            v-if="!n.read"
            class="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-accent-400 flex-shrink-0"
          />
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            :class="iconFor[n.type]?.bg || 'bg-surface-sunken'"
          >
            <svg class="w-5 h-5" :class="iconFor[n.type]?.color || 'text-ink-faint'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" :d="iconFor[n.type]?.path" />
            </svg>
          </div>
          <div class="min-w-0 flex-1 pr-4">
            <p class="text-sm font-medium text-ink break-words">{{ n.title }}</p>
            <p class="text-xs text-ink-soft mt-0.5 break-words whitespace-pre-wrap">{{ n.body }}</p>
            <p class="text-xs text-ink-faint mt-1">{{ n.time }}</p>
          </div>
        </BaseCard>
      </div>

      <EmptyState v-else :title="t('notifications.noNotifications')" :message="t('notifications.noNotificationsDesc')" />
    </main>
  </div>
</template>
