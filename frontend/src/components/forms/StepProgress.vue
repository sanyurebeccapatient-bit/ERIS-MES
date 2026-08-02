<script setup>
defineProps({
  steps: { type: Array, required: true },
  current: { type: Number, required: true },
})
</script>

<template>
  <div>
    <div class="flex items-center gap-1.5">
      <div
        v-for="(step, i) in steps"
        :key="i"
        class="flex-1 h-1.5 rounded-pill transition-colors duration-300"
        :class="i <= current ? 'bg-primary-500' : 'bg-surface-sunken'"
      />
    </div>
    <p class="text-xs text-ink-soft mt-2">
      {{ current + 1 }} {{ '/' }} {{ steps.length }} · {{ steps[current] }}
    </p>
  </div>
</template>
