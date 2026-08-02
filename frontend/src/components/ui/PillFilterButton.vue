<script setup>
// Rounded pill filter/tab button, styled to match the caregiver-side filter
// tabs (Visits, Reports, etc.) — h-9, rounded-full, consistent active/inactive
// colors — so admin filter rows look the same as the caregiver ones.
defineProps({
  active: { type: Boolean, default: false },
})
defineEmits(['click'])
</script>

<template>
  <button
    type="button"
    class="px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors"
    :class="active ? 'bg-primary-500 text-white' : 'bg-surface-raised border border-border text-ink-soft'"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>
