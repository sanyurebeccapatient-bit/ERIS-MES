<script setup>
const props = defineProps({
  tone: { type: String, default: 'neutral' }, // neutral | success | warning | danger | info
})

const tones = {
  neutral: 'bg-surface-sunken text-ink-soft',
  success: 'bg-success-500/10 text-success-600',
  warning: 'bg-accent-400/15 text-accent-600',
  danger: 'bg-danger-500/10 text-danger-600',
  info: 'bg-primary-500/10 text-primary-600',
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-xs font-semibold"
    :class="tones[props.tone]"
  >
    <slot />
  </span>
</template>
