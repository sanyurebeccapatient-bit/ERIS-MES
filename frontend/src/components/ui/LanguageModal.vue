<script setup>
import { computed } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useI18n } from '@/i18n/index.js'

const modelValue = defineModel({ type: Boolean, default: false })

const { t, locale, setLocale, localeNames } = useI18n()

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'rw', name: 'Ikinyarwanda', flag: '🇷🇼' },
  { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' },
]

function selectLanguage(code) {
  setLocale(code)
  // Close modal after language change for better UX
  modelValue.value = false
}
</script>

<template>
  <BaseModal v-model="modelValue" :title="t('language.title')" size="sm">
    <p class="text-sm text-ink-soft mb-4">{{ t('language.subtitle') }}</p>
    <div class="space-y-2">
      <button
        v-for="lang in languages"
        :key="lang.code"
        class="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-colors text-left"
        :class="locale === lang.code ? 'border-primary-500 bg-primary-50' : 'border-border bg-surface-raised'"
        @click="selectLanguage(lang.code)"
      >
        <span class="text-2xl flex-shrink-0">{{ lang.flag }}</span>
        <div class="min-w-0 flex-1">
          <p class="font-medium text-ink">{{ lang.name }}</p>
        </div>
        <div
          v-if="locale === lang.code"
          class="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center flex-shrink-0"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </button>
    </div>
  </BaseModal>
</template>
