<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'

// mode: 'date' | 'time'
// modelValue for date: 'YYYY-MM-DD' string
// modelValue for time: 'HH:MM' (24h) string
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'date' },
  value: { type: String, default: '' },
  title: { type: String, default: '' },
  minDate: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'confirm'])

function close() {
  emit('update:modelValue', false)
}

// ---------------------------------------------------------------------
// DATE MODE
// ---------------------------------------------------------------------
const today = new Date()
today.setHours(0, 0, 0, 0)

function parseDateStr(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())
const selectedDate = ref(parseDateStr(props.value) || today)

watch(
  () => props.modelValue,
  (open) => {
    if (open && props.mode === 'date') {
      const base = parseDateStr(props.value) || today
      selectedDate.value = base
      viewYear.value = base.getFullYear()
      viewMonth.value = base.getMonth()
    }
    if (open && props.mode === 'time') {
      const t = props.value || '09:00'
      const [h, m] = t.split(':').map(Number)
      selHour.value = h ?? 9
      selMinute.value = m ?? 0
    }
  }
)

const monthLabel = computed(() =>
  new Date(viewYear.value, viewMonth.value, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
)

const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const calendarDays = computed(() => {
  const firstOfMonth = new Date(viewYear.value, viewMonth.value, 1)
  const startOffset = firstOfMonth.getDay()
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear.value, viewMonth.value, d))
  return cells
})

const minDateObj = computed(() => (props.minDate ? parseDateStr(props.minDate) : null))

function isDisabled(date) {
  if (!date || !minDateObj.value) return false
  return date < minDateObj.value
}

function isSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value -= 1
  } else {
    viewMonth.value -= 1
  }
}
function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value += 1
  } else {
    viewMonth.value += 1
  }
}

function pickDay(date) {
  if (!date || isDisabled(date)) return
  selectedDate.value = date
}

function fmtLocal(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function confirmDate() {
  emit('confirm', fmtLocal(selectedDate.value))
  close()
}

function pickToday() {
  if (isDisabled(today)) return
  selectedDate.value = today
  viewYear.value = today.getFullYear()
  viewMonth.value = today.getMonth()
}

// ---------------------------------------------------------------------
// TIME MODE
// ---------------------------------------------------------------------
const selHour = ref(9)
const selMinute = ref(0)

const hourList = Array.from({ length: 24 }, (_, i) => i)
const minuteList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

const displayPeriod = computed(() => (selHour.value >= 12 ? 'PM' : 'AM'))
const displayHour12 = computed(() => {
  const h = selHour.value % 12
  return h === 0 ? 12 : h
})

function pickHour(h) {
  selHour.value = h
}
function pickMinute(m) {
  selMinute.value = m
}

function confirmTime() {
  const hh = String(selHour.value).padStart(2, '0')
  const mm = String(selMinute.value).padStart(2, '0')
  emit('confirm', `${hh}:${mm}`)
  close()
}

function pickNow() {
  const now = new Date()
  selHour.value = now.getHours()
  selMinute.value = Math.round(now.getMinutes() / 5) * 5 % 60
}

const modalTitle = computed(() => props.title || (props.mode === 'date' ? 'Select date' : 'Select time'))
</script>

<template>
  <BaseModal :model-value="modelValue" :title="modalTitle" size="sm" @update:model-value="(v) => emit('update:modelValue', v)">
    <!-- DATE PICKER -->
    <div v-if="mode === 'date'" class="select-none">
      <div class="flex items-center justify-between mb-3">
        <button
          type="button"
          class="w-9 h-9 rounded-full flex items-center justify-center text-ink-soft active:bg-surface-sunken"
          @click="prevMonth"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.25">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <p class="font-display font-semibold text-ink">{{ monthLabel }}</p>
        <button
          type="button"
          class="w-9 h-9 rounded-full flex items-center justify-center text-ink-soft active:bg-surface-sunken"
          @click="nextMonth"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.25">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div class="grid grid-cols-7 gap-1 mb-1">
        <div v-for="(w, i) in weekdayLabels" :key="i" class="h-8 flex items-center justify-center text-xs font-medium text-ink-faint">
          {{ w }}
        </div>
      </div>

      <div class="grid grid-cols-7 gap-1">
        <div v-for="(day, idx) in calendarDays" :key="idx" class="aspect-square">
          <button
            v-if="day"
            type="button"
            class="w-full h-full rounded-full flex items-center justify-center text-sm font-medium transition-colors"
            :class="[
              isSameDay(day, selectedDate) ? 'bg-primary-500 text-white' : isSameDay(day, today) ? 'text-primary-600 bg-primary-50' : 'text-ink',
              isDisabled(day) ? 'opacity-30 cursor-not-allowed' : 'active:bg-surface-sunken',
            ]"
            :disabled="isDisabled(day)"
            @click="pickDay(day)"
          >
            {{ day.getDate() }}
          </button>
        </div>
      </div>

      <button type="button" class="mt-3 text-sm font-semibold text-primary-500 active:text-primary-600" @click="pickToday">
        Today
      </button>
    </div>

    <!-- TIME PICKER -->
    <div v-else class="select-none">
      <div class="flex items-center justify-center gap-2 mb-4">
        <span class="font-display text-3xl font-semibold text-ink tabular-nums">{{ String(displayHour12).padStart(2, '0') }}</span>
        <span class="font-display text-3xl font-semibold text-ink-faint">:</span>
        <span class="font-display text-3xl font-semibold text-ink tabular-nums">{{ String(selMinute).padStart(2, '0') }}</span>
        <span class="ml-2 px-2.5 py-1 rounded-lg bg-primary-500/10 text-primary-600 text-sm font-semibold">{{ displayPeriod }}</span>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <p class="text-xs font-medium text-ink-faint mb-1.5 text-center">Hour</p>
          <div class="h-44 overflow-y-auto rounded-xl border border-border bg-surface">
            <button
              v-for="h in hourList"
              :key="h"
              type="button"
              class="w-full h-10 flex items-center justify-center text-sm font-medium transition-colors"
              :class="h === selHour ? 'bg-primary-500 text-white' : 'text-ink active:bg-surface-sunken'"
              @click="pickHour(h)"
            >
              {{ String(h).padStart(2, '0') }}
            </button>
          </div>
        </div>
        <div>
          <p class="text-xs font-medium text-ink-faint mb-1.5 text-center">Minute</p>
          <div class="h-44 overflow-y-auto rounded-xl border border-border bg-surface">
            <button
              v-for="m in minuteList"
              :key="m"
              type="button"
              class="w-full h-10 flex items-center justify-center text-sm font-medium transition-colors"
              :class="m === selMinute ? 'bg-primary-500 text-white' : 'text-ink active:bg-surface-sunken'"
              @click="pickMinute(m)"
            >
              {{ String(m).padStart(2, '0') }}
            </button>
          </div>
        </div>
      </div>

      <button type="button" class="mt-3 text-sm font-semibold text-primary-500 active:text-primary-600" @click="pickNow">
        Now
      </button>
    </div>

    <template #footer>
      <BaseButton variant="outline" full-width @click="close">Cancel</BaseButton>
      <BaseButton variant="primary" full-width @click="mode === 'date' ? confirmDate() : confirmTime()">Done</BaseButton>
    </template>
  </BaseModal>
</template>
