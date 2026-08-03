<script setup>
import { useI18n, refreshKey } from '@/i18n/index.js'

const props = defineProps({
  visit: { type: Object, required: true },
  clickable: { type: Boolean, default: false },
})

const emit = defineEmits(['click'])

const { t } = useI18n()

const visitTypeKeyMap = { 'Home Visit': 'home', 'Health Follow-up': 'health', 'Attendance Follow-up': 'attendance', 'Nutrition Check': 'nutrition', 'Social Welfare Check': 'social', 'Other': 'other' }

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
</script>

<template>
  <div
    class="flex items-center gap-3 py-3 border-b border-border/60 last:border-0"
    :class="clickable ? 'cursor-pointer active:bg-surface-sunken/40 -mx-2 px-2 rounded-lg transition-colors' : ''"
    @click="clickable && emit('click', visit)"
  >
    <div class="w-11 h-11 rounded-full bg-primary-500/10 flex items-center justify-center flex-shrink-0">
      <svg class="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
        <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </div>
    <div class="min-w-0 flex-1">
      <p class="font-medium text-sm text-ink truncate">{{ visit.child?.name || '—' }}</p>
      <p class="text-xs text-ink-soft truncate">{{ t('visits.visitTypes.' + (visitTypeKeyMap[visit.type] || 'home')) }}{{ visit.address ? ' · ' + visit.address : '' }}</p>
    </div>
    <span class="text-xs font-semibold text-primary-600 flex-shrink-0">
      {{ formatTime(visit.scheduledFor) }}
    </span>
  </div>
</template>
