<script setup>
// Circular "+" add button, styled to match the caregiver-side Children/Visits
// pages — a plain w-9 h-9 filled circle with just a plus icon, placed at the
// right edge of the toolbar row. Used across admin pages so the primary
// "add" action always looks and behaves the same way.
defineProps({
  label: { type: String, default: 'Add' },
  disabled: { type: Boolean, default: false },
})
defineEmits(['click'])
</script>

<template>
  <button
    type="button"
    class="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center flex-shrink-0 active:bg-primary-600 disabled:opacity-60 transition-colors"
    :aria-label="label"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.25">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  </button>
</template>
