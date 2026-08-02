<script setup>
defineProps({
  padded: { type: Boolean, default: true },
  interactive: { type: Boolean, default: false },
})
</script>

<template>
  <div
    class="bg-surface-raised dark:bg-surface-dark-raised rounded-card shadow-card border border-border/60 dark:border-border-dark"
    :class="[padded ? 'p-4' : '', interactive ? 'active:scale-[0.98] transition-transform duration-100 cursor-pointer' : '']"
  >
    <slot />
  </div>
</template>
