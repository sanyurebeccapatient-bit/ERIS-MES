<script setup>
defineProps({
  height: { type: String, default: '1rem' },
  width: { type: String, default: '100%' },
  rounded: { type: String, default: 'rounded-md' },
})
</script>

<template>
  <div class="skeleton" :class="rounded" :style="{ height, width }" />
</template>
