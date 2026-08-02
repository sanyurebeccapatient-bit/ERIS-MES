<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSyncStore } from '@/stores/sync'
import { SYNC_STATUS } from '@/constants'

const props = defineProps({
  showLabel: { type: Boolean, default: true },
  compact: { type: Boolean, default: false },
})

const syncStore = useSyncStore()
const { status, pendingCount } = storeToRefs(syncStore)

const config = computed(() => {
  switch (status.value) {
    case SYNC_STATUS.OFFLINE:
      return { color: 'bg-ink-faint', ring: false, label: 'Offline', textTone: 'text-ink-faint' }
    case SYNC_STATUS.SYNCING:
      return { color: 'bg-accent-400', ring: true, label: 'Syncing…', textTone: 'text-accent-600' }
    case SYNC_STATUS.PENDING:
      return { color: 'bg-accent-400', ring: false, label: `${pendingCount.value} pending`, textTone: 'text-accent-600' }
    case SYNC_STATUS.FAILED:
      return { color: 'bg-danger-500', ring: false, label: 'Sync failed', textTone: 'text-danger-600' }
    default:
      return { color: 'bg-success-500', ring: false, label: 'Synced', textTone: 'text-success-600' }
  }
})
</script>

<template>
  <button
    class="inline-flex items-center gap-2 touch-target px-2 -mx-2"
    :class="compact ? '!min-h-0 !min-w-0' : ''"
    :aria-label="`Sync status: ${config.label}`"
    @click="syncStore.manualSync()"
  >
    <span class="relative flex h-2.5 w-2.5">
      <span
        v-if="config.ring"
        class="animate-pulse-ring absolute inline-flex h-full w-full rounded-full opacity-75"
        :class="config.color"
      />
      <span class="relative inline-flex rounded-full h-2.5 w-2.5" :class="config.color" />
    </span>
    <span v-if="showLabel" class="text-xs font-medium" :class="config.textTone">
      {{ config.label }}
    </span>
  </button>
</template>
