<script setup>
import { watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  size: { type: String, default: 'md' }, // sm | md | lg
  closeOnBackdrop: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'close'])

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
}

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onBackdrop() {
  if (props.closeOnBackdrop) close()
}

function onKeydown(e) {
  if (e.key === 'Escape' && props.modelValue) close()
}

watch(
  () => props.modelValue,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  }
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})

window.addEventListener('keydown', onKeydown)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      >
        <div
          class="fixed -inset-x-4 -inset-y-4 bg-ink/50 backdrop-blur-[2px]"
          @click="onBackdrop"
        />
        <div
          class="relative w-full bg-surface-raised rounded-t-2xl sm:rounded-2xl shadow-raised max-h-[92vh] flex flex-col safe-area-bottom"
          :class="sizes[size]"
          role="dialog"
          aria-modal="true"
        >
          <div class="flex items-center justify-between px-5 h-14 border-b border-border flex-shrink-0">
            <h2 class="font-display font-semibold text-ink truncate">{{ title }}</h2>
            <button
              class="touch-target -mr-2 rounded-full flex items-center justify-center"
              aria-label="Close"
              @click="close"
            >
              <svg class="w-5 h-5 text-ink-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="px-5 py-4 overflow-y-auto flex-1">
            <slot />
          </div>

          <div v-if="$slots.footer" class="px-5 py-3.5 border-t border-border flex-shrink-0 flex gap-3">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.15s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
