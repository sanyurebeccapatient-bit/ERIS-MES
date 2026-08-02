<script setup>
import { ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useI18n } from '@/i18n/index.js'
import * as authService from '@/services/api/auth.service'
import { formatRwandaPhone, toCompactPhone, isCompleteRwandaPhone, blockNonDigitKey } from '@/composables/usePhoneFormat.js'

const { t } = useI18n()

const props = defineProps({
  initialPhone: { type: String, default: '' },
})

const modelValue = defineModel({ type: Boolean, default: false })

const phone = ref('+250 ')
const loading = ref(false)
const error = ref('')
const submitted = ref(false)

watch(modelValue, (open) => {
  if (open) {
    phone.value = props.initialPhone && props.initialPhone.trim() !== '+250' ? props.initialPhone : '+250 '
    error.value = ''
    submitted.value = false
  }
})

function onPhoneInput(e) {
  phone.value = formatRwandaPhone(e.target.value)
}

async function submit() {
  error.value = ''
  if (!isCompleteRwandaPhone(phone.value)) {
    error.value = t('login.forgotPinFlow.error')
    return
  }
  loading.value = true
  try {
    await authService.requestPinReset(toCompactPhone(phone.value))
    submitted.value = true
  } catch (e) {
    error.value = e.message || t('login.forgotPinFlow.error')
  } finally {
    loading.value = false
  }
}

function close() {
  modelValue.value = false
}
</script>

<template>
  <BaseModal v-model="modelValue" :title="t('login.forgotPinFlow.title')" size="sm">
    <div v-if="!submitted" class="space-y-4">
      <p class="text-sm text-ink-soft">{{ t('login.forgotPinFlow.intro') }}</p>

      <div>
        <label class="block text-sm font-semibold text-ink mb-1.5">
          {{ t('login.forgotPinFlow.phoneLabel') }}
        </label>
        <div
          class="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-3.5 h-touch-lg focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 transition-colors"
        >
          <svg class="w-5 h-5 text-ink-faint flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a2.25 2.25 0 002.25-2.25v-1.372a1.5 1.5 0 00-1.06-1.437l-4.145-1.383a1.5 1.5 0 00-1.657.446l-.804 1.005a11.25 11.25 0 01-6.364-6.364l1.005-.804a1.5 1.5 0 00.446-1.657L7.058 3.06a1.5 1.5 0 00-1.437-1.06H4.25A2.25 2.25 0 002 4.25v2.5z" />
          </svg>
          <input
            :value="phone"
            type="tel"
            inputmode="numeric"
            pattern="[0-9\s+]*"
            autocomplete="tel"
            maxlength="17"
            placeholder="+250 7__ ___ ___"
            class="w-full bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none"
            @input="onPhoneInput"
            @keydown="blockNonDigitKey"
            @keydown.enter.prevent="submit"
          />
        </div>
      </div>

      <p
        v-if="error"
        class="flex items-start gap-2 text-sm text-danger-600 bg-danger-50 rounded-xl px-3.5 py-2.5"
      >
        <svg class="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <span>{{ error }}</span>
      </p>
    </div>

    <div v-else class="space-y-3 text-center py-2">
      <div class="w-14 h-14 rounded-full bg-success-50 text-success-600 flex items-center justify-center mx-auto">
        <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p class="text-sm text-ink-soft leading-relaxed">{{ t('login.forgotPinFlow.success') }}</p>
    </div>

    <template #footer>
      <BaseButton v-if="!submitted" variant="primary" size="lg" full-width :loading="loading" @click="submit">
        {{ t('login.forgotPinFlow.submit') }}
      </BaseButton>
      <BaseButton v-else variant="primary" size="lg" full-width @click="close">
        {{ t('login.forgotPinFlow.close') }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
