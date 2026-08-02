<script setup>
defineProps({
  title: { type: String, required: true },
  message: { type: String, default: '' },
})
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center py-12 px-6">
    <div class="w-16 h-16 rounded-full bg-surface-sunken flex items-center justify-center mb-4">
      <slot name="icon">
        <svg class="w-7 h-7 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </slot>
    </div>
    <h3 class="font-display font-semibold text-ink mb-1">{{ title }}</h3>
    <p v-if="message" class="text-sm text-ink-soft max-w-xs">{{ message }}</p>
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>
