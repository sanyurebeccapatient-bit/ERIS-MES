<script setup>
// Modern SVG icon set replacing emoji stickers for report types.
const props = defineProps({
  type: { type: String, required: true }, // attendance | health | visit | general
  size: { type: String, default: 'md' }, // sm | md | lg
})

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-7 h-7',
}

const paths = {
  attendance: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  health: 'M9 12h1.5l1-2 2 4 1-2H16M8.5 5A3.5 3.5 0 005 8.5c0 4.5 7 9 7 9s7-4.5 7-9A3.5 3.5 0 0015.5 5c-1.31 0-2.47.635-3.19 1.612l-.31.418-.31-.418A3.987 3.987 0 008.5 5z',
  visit: 'M3 9.5L12 3l9 6.5M5 8.5V20a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V8.5',
  general: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
}

const tones = {
  attendance: 'text-primary-500',
  health: 'text-danger-500',
  visit: 'text-accent-600',
  general: 'text-ink-soft',
}
</script>

<template>
  <svg
    :class="[sizes[size], tones[type] || 'text-ink-soft']"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="1.8"
  >
    <path stroke-linecap="round" stroke-linejoin="round" :d="paths[type] || paths.general" />
  </svg>
</template>
