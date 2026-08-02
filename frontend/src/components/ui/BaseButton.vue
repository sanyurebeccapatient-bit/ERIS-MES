<script setup>
defineProps({
  variant: { type: String, default: 'primary' }, // primary | accent | outline | ghost | danger
  size: { type: String, default: 'md' }, // sm | md | lg
  fullWidth: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  type: { type: String, default: 'button' },
})
defineEmits(['click'])

const variants = {
  primary: 'bg-primary-500 text-white active:bg-primary-600 disabled:bg-primary-200',
  accent: 'bg-accent-400 text-ink active:bg-accent-500 disabled:bg-accent-100',
  outline: 'bg-transparent border-2 border-primary-500 text-primary-500 active:bg-primary-50',
  ghost: 'bg-transparent text-primary-500 active:bg-primary-50',
  danger: 'bg-danger-500 text-white active:bg-danger-600 disabled:bg-danger-100',
}

const sizes = {
  sm: 'h-10 px-4 text-sm rounded-xl',
  md: 'h-touch px-5 text-base rounded-xl',
  lg: 'h-touch-lg px-6 text-lg rounded-2xl',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 select-none disabled:cursor-not-allowed disabled:opacity-70"
    :class="[variants[variant], sizes[size], fullWidth ? 'w-full' : '']"
    @click="$emit('click', $event)"
  >
    <svg v-if="loading" class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
    <slot v-else name="icon" />
    <slot />
  </button>
</template>
