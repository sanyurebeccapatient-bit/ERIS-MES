<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useSyncStore } from '@/stores/sync'
import { SYNC_STATUS } from '@/constants'
import { useI18n } from '@/i18n/index.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()
const syncStore = useSyncStore()
const { status, pendingCount, lastSyncedAt } = storeToRefs(syncStore)

const statusInfo = computed(() => {
  switch (status.value) {
    case SYNC_STATUS.OFFLINE:
      return { color: 'bg-ink-faint', label: t('sync.offline') || 'Offline', tone: 'text-ink-faint' }
    case SYNC_STATUS.SYNCING:
      return { color: 'bg-accent-400', label: t('sync.syncing') || 'Syncing…', tone: 'text-accent-600' }
    case SYNC_STATUS.PENDING:
      return { color: 'bg-accent-400', label: t('sync.pending') || `${pendingCount.value} item(s) pending`, tone: 'text-accent-600' }
    case SYNC_STATUS.FAILED:
      return { color: 'bg-danger-500', label: t('sync.failed') || 'Sync failed', tone: 'text-danger-600' }
    default:
      return { color: 'bg-success-500', label: t('sync.synced') || 'All data synced', tone: 'text-success-600' }
  }
})

const lastSyncedLabel = computed(() => {
  if (!lastSyncedAt.value) return t('sync.neverSynced') || 'Not synced yet this session'
  try {
    return new Date(lastSyncedAt.value).toLocaleString()
  } catch {
    return lastSyncedAt.value
  }
})

const syncing = computed(() => status.value === SYNC_STATUS.SYNCING)

async function syncNow() {
  await syncStore.manualSync()
}

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <BaseModal :model-value="modelValue" :title="t('profile.syncSettings') || 'Sync settings'" size="sm" @update:model-value="(v) => emit('update:modelValue', v)">
    <div class="space-y-5">
      <!-- Status -->
      <div class="rounded-xl border border-border p-4 flex items-center gap-3">
        <span class="relative flex h-3 w-3 flex-shrink-0">
          <span
            v-if="syncing"
            class="animate-pulse-ring absolute inline-flex h-full w-full rounded-full opacity-75"
            :class="statusInfo.color"
          />
          <span class="relative inline-flex rounded-full h-3 w-3" :class="statusInfo.color" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold" :class="statusInfo.tone">{{ statusInfo.label }}</p>
          <p class="text-xs text-ink-faint mt-0.5">Last synced: {{ lastSyncedLabel }}</p>
        </div>
      </div>

      <p class="text-sm text-ink-soft leading-relaxed">
        Your reports, attendance, and visits are saved on this device and synced automatically whenever you have an internet connection.
      </p>

      <BaseButton variant="primary" full-width :loading="syncing" @click="syncNow">
        <template #icon>
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </template>
        {{ t('sync.syncNow') || 'Sync now' }}
      </BaseButton>
    </div>
    <template #footer>
      <BaseButton variant="outline" full-width @click="close">{{ t('common.close') || 'Close' }}</BaseButton>
    </template>
  </BaseModal>
</template>
