<script setup>
import { ref, computed, onBeforeUnmount, nextTick } from 'vue'

// Generic styled dropdown that replaces native <select>.
// options: [{ value, label, subLabel?, photo?, initials? }]
// Set showAvatar to true to render a leading photo/initials circle per option
// (used for picking children).
const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Select…' },
  showAvatar: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  size: { type: String, default: 'md' }, // md | sm (sm = compact toolbar filter)
})
const emit = defineEmits(['update:modelValue', 'change'])

const open = ref(false)
const rootEl = ref(null)

const selected = computed(() => props.options.find((o) => o.value === props.modelValue) || null)

function toggle() {
  if (props.disabled) return
  open.value = !open.value
}

function choose(opt) {
  emit('update:modelValue', opt.value)
  emit('change', opt.value)
  open.value = false
}

function initialsFor(opt) {
  if (opt.initials) return opt.initials
  return (opt.label || '')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function onDocClick(e) {
  if (rootEl.value && !rootEl.value.contains(e.target)) open.value = false
}

function onOpenChange(val) {
  if (val) {
    nextTick(() => document.addEventListener('click', onDocClick))
  } else {
    document.removeEventListener('click', onDocClick)
  }
}

import { watch } from 'vue'
watch(open, onOpenChange)

onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="rootEl" class="relative">
    <button
      type="button"
      class="w-full rounded-xl bg-surface border border-border flex items-center justify-between gap-2 transition-colors"
      :class="[
        size === 'sm' ? 'h-10 px-3 text-sm' : 'h-touch-lg px-4 text-base',
        open ? 'border-primary-400 ring-2 ring-primary-100' : 'focus:border-primary-400',
        disabled ? 'opacity-60 cursor-not-allowed' : 'active:bg-surface-sunken',
      ]"
      :disabled="disabled"
      @click="toggle"
    >
      <span class="flex items-center gap-2.5 min-w-0">
        <template v-if="showAvatar && selected">
          <img
            v-if="selected.photo"
            :src="selected.photo"
            :alt="selected.label"
            class="w-7 h-7 rounded-full object-cover flex-shrink-0"
          />
          <span
            v-else
            class="w-7 h-7 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600 font-display font-semibold text-[11px] flex-shrink-0"
          >
            {{ initialsFor(selected) }}
          </span>
        </template>
        <span class="truncate" :class="selected ? 'text-ink' : 'text-ink-faint'">
          {{ selected ? selected.label : placeholder }}
        </span>
      </span>
      <svg
        class="w-4 h-4 text-ink-faint flex-shrink-0 transition-transform duration-150"
        :class="open ? 'rotate-180' : ''"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2.25"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <Transition name="select-pop">
      <div
        v-if="open"
        class="absolute z-30 mt-1.5 w-full bg-surface-raised border border-border rounded-xl shadow-raised max-h-64 overflow-y-auto py-1.5"
      >
        <div v-if="!options.length" class="px-4 py-3 text-sm text-ink-faint text-center">
          {{ placeholder }}
        </div>
        <button
          v-for="opt in options"
          :key="opt.value"
          type="button"
          class="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors"
          :class="opt.value === modelValue ? 'bg-primary-50' : 'active:bg-surface-sunken'"
          @click="choose(opt)"
        >
          <template v-if="showAvatar">
            <img
              v-if="opt.photo"
              :src="opt.photo"
              :alt="opt.label"
              class="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
            <span
              v-else
              class="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600 font-display font-semibold text-xs flex-shrink-0"
            >
              {{ initialsFor(opt) }}
            </span>
          </template>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium truncate" :class="opt.value === modelValue ? 'text-primary-600' : 'text-ink'">
              {{ opt.label }}
            </span>
            <span v-if="opt.subLabel" class="block text-xs text-ink-faint truncate">{{ opt.subLabel }}</span>
          </span>
          <svg
            v-if="opt.value === modelValue"
            class="w-4 h-4 text-primary-500 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.select-pop-enter-active,
.select-pop-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.select-pop-enter-from,
.select-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
