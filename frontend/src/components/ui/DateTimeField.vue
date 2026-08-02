<script setup>
import { ref, computed } from 'vue'
import DateTimePickerModal from './DateTimePickerModal.vue'

// type: 'date' | 'time'
const props = defineProps({
  modelValue: { type: String, default: '' },
  type: { type: String, default: 'date' },
  placeholder: { type: String, default: '' },
  minDate: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const showPicker = ref(false)

function open() {
  showPicker.value = true
}

function onConfirm(val) {
  emit('update:modelValue', val)
}

const displayValue = computed(() => {
  if (!props.modelValue) return ''
  if (props.type === 'date') {
    const [y, m, d] = props.modelValue.split('-').map(Number)
    if (!y) return props.modelValue
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  const [h, m] = props.modelValue.split(':').map(Number)
  if (Number.isNaN(h)) return props.modelValue
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`
})
</script>

<template>
  <button
    type="button"
    class="w-full h-touch-lg px-4 rounded-xl bg-surface border border-border text-base flex items-center justify-between gap-2 active:bg-surface-sunken transition-colors"
    @click="open"
  >
    <span class="flex items-center gap-2.5 truncate" :class="modelValue ? 'text-ink' : 'text-ink-faint'">
      <svg v-if="type === 'date'" class="w-4 h-4 text-ink-faint flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <svg v-else class="w-4 h-4 text-ink-faint flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span class="truncate">{{ displayValue || placeholder || (type === 'date' ? 'Select date' : 'Select time') }}</span>
    </span>
    <svg class="w-4 h-4 text-ink-faint flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.25">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  </button>

  <DateTimePickerModal
    v-model="showPicker"
    :mode="type"
    :value="modelValue"
    :min-date="minDate"
    @confirm="onConfirm"
  />
</template>
