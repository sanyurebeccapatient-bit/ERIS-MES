<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getTodayAttendance } from '@/services/api/records.service'
import { queueWrite, submitOrQueue } from '@/services/offline/syncEngine'
import { useSyncStore } from '@/stores/sync'
import { useDashboardStore } from '@/stores/dashboard'
import { useI18n, refreshKey } from '@/i18n/index.js'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'

const { t } = useI18n()
const loading = ref(true)
const records = ref([])
const syncStore = useSyncStore()
const dashboardStore = useDashboardStore()
const router = useRouter()

// QR scanning hardware isn't wired up yet, so the CTA routes into the
// existing attendance report flow (report type pre-selected) instead of
// being a dead button.
function startQrAttendance() {
  router.push({ name: 'new-report', query: { type: 'attendance' } })
}

onMounted(async () => {
  try {
    records.value = await getTodayAttendance()
  } finally {
    loading.value = false
  }
})

const statusTone = { present: 'success', absent: 'danger', late: 'warning', excused: 'neutral' }
const statusLabel = computed(() => ({ present: t('common.present'), absent: t('common.absent'), late: t('common.late'), excused: t('common.excused') }))

const summary = computed(() => ({
  present: records.value.filter((r) => r.status === 'present').length,
  absent: records.value.filter((r) => r.status === 'absent').length,
  late: records.value.filter((r) => r.status === 'late').length,
}))

async function markPresent(record) {
  record.status = 'present'
  record.time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const { queued } = await submitOrQueue('attendance', 'post', '/attendance', {
    childId: record.childId,
    status: 'present',
    time: record.time,
  })
  syncStore.refreshPendingCount()
  if (queued) await syncStore.manualSync()
  // Keep the caregiver dashboard's "Present today" stat and related
  // summary numbers in sync the moment attendance changes here.
  dashboardStore.refreshAttendanceStats()
}

const localeKey = refreshKey
</script>

<template>
  <div :key="'attendance-' + localeKey">

    <main class="px-4 pt-4 space-y-4">
      <!-- Scan QR CTA -->
      <BaseButton variant="primary" size="lg" full-width @click="startQrAttendance">
        <template #icon>
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4h4v4H4V4zm0 12h4v4H4v-4zm12-12h4v4h-4V4zm0 12h4v4h-4v-4zM4 10h4v4H4v-4zm8-6h4v4h-4V4zm4 8h-4v4h4v-4zm-8 0h4v4H8v-4z" />
          </svg>
        </template>
        {{ t('attendance.scanQr') }}
      </BaseButton>

      <!-- Summary strip -->
      <div v-if="!loading" class="grid grid-cols-3 gap-2.5">
        <BaseCard class="text-center !py-3">
          <p class="text-xl font-display font-bold text-success-600">{{ summary.present }}</p>
          <p class="text-xs text-ink-soft">{{ t('common.present') }}</p>
        </BaseCard>
        <BaseCard class="text-center !py-3">
          <p class="text-xl font-display font-bold text-accent-600">{{ summary.late }}</p>
          <p class="text-xs text-ink-soft">{{ t('common.late') }}</p>
        </BaseCard>
        <BaseCard class="text-center !py-3">
          <p class="text-xl font-display font-bold text-danger-600">{{ summary.absent }}</p>
          <p class="text-xs text-ink-soft">{{ t('common.absent') }}</p>
        </BaseCard>
      </div>

      <div v-if="loading" class="space-y-2.5">
        <SkeletonBlock v-for="i in 5" :key="i" height="4.5rem" rounded="rounded-card" />
      </div>

      <div v-else class="space-y-2.5">
        <BaseCard v-for="record in records" :key="record.id" class="flex items-center gap-3">
          <div class="min-w-0 flex-1">
            <p class="font-medium text-ink truncate">{{ record.child?.name }}</p>
            <p class="text-xs text-ink-soft">{{ record.time ? `${t('attendance.markedAt', { time: record.time })}` : t('attendance.notMarked') }}</p>
          </div>
          <BaseButton
            v-if="record.status === 'absent'"
            variant="outline"
            size="sm"
            @click="markPresent(record)"
          >
            {{ t('attendance.markPresent') }}
          </BaseButton>
          <BaseBadge v-else :tone="statusTone[record.status]">
            {{ statusLabel[record.status] }}
          </BaseBadge>
        </BaseCard>
      </div>
    </main>
  </div>
</template>
