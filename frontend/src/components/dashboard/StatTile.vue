<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  sub: { type: String, default: '' },
  tone: { type: String, default: 'primary' }, // primary | accent | danger | success
})

const toneStyles = {
  primary: 'bg-primary-500/8 text-primary-600',
  accent: 'bg-accent-400/12 text-accent-600',
  danger: 'bg-danger-500/8 text-danger-600',
  success: 'bg-success-500/8 text-success-600',
}
</script>

<template>
  <div class="bg-surface-raised rounded-card p-3.5 shadow-card border border-border/60 flex flex-col gap-1.5">
    <div class="flex items-center justify-between">
      <span class="w-8 h-8 rounded-lg flex items-center justify-center" :class="toneStyles[tone]">
        <slot name="icon" />
      </span>
    </div>
    <div>
      <p class="text-2xl font-display font-bold text-ink leading-none">{{ value }}</p>
      <p class="text-xs text-ink-soft mt-1">{{ label }}</p>
      <p v-if="sub" class="text-[0.6875rem] text-ink-faint mt-0.5">{{ sub }}</p>
    </div>
  </div>
</template>
