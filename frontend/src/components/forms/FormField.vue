<script setup>
defineProps({
  label: { type: String, required: true },
  hint: { type: String, default: '' },
  required: { type: Boolean, default: false },
})
</script>

<template>
  <div>
    <label class="block text-sm font-medium text-ink mb-1.5">
      {{ label }}
      <span v-if="required" class="text-danger-500">*</span>
    </label>
    <slot />
    <p v-if="hint" class="text-xs text-ink-faint mt-1.5">{{ hint }}</p>
  </div>
</template>
