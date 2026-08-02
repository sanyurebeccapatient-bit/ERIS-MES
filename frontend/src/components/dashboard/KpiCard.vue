<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  delta: { type: String, default: '' },
  deltaTone: { type: String, default: 'success' }, // success | danger
  tone: { type: String, default: 'primary' },
})

const toneStyles = {
  primary: 'bg-primary-500/8 text-primary-600',
  accent: 'bg-accent-400/12 text-accent-600',
  danger: 'bg-danger-500/8 text-danger-600',
  success: 'bg-success-500/8 text-success-600',
}
</script>

<template>
  <div class="bg-surface-raised rounded-card p-5 shadow-card border border-border/60">
    <div class="flex items-start justify-between mb-4">
      <span class="w-10 h-10 rounded-xl flex items-center justify-center" :class="toneStyles[tone]">
        <slot name="icon" />
      </span>
      <span
        v-if="delta"
        class="text-xs font-semibold px-2 py-1 rounded-pill"
        :class="deltaTone === 'success' ? 'bg-success-500/10 text-success-600' : 'bg-danger-500/10 text-danger-600'"
      >
        {{ delta }}
      </span>
    </div>
    <p class="text-3xl font-display font-bold text-ink leading-none">{{ value }}</p>
    <p class="text-sm text-ink-soft mt-1.5">{{ label }}</p>
  </div>
</template>
