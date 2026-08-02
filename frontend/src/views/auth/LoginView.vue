<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import LanguageModal from '@/components/ui/LanguageModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n, refreshKey } from '@/i18n/index.js'
import { formatRwandaPhone, toCompactPhone, blockNonDigitKey } from '@/composables/usePhoneFormat.js'
import ForgotPinModal from '@/components/auth/ForgotPinModal.vue'
import { usePwaInstall } from '@/composables/usePwaInstall.js'

const { t, locale } = useI18n()
const localeKey = refreshKey
const { isInstallable, isInstalled, installing, promptInstall } = usePwaInstall()

const phone = ref('+250 ')
function onPhoneInput(e) {
  phone.value = formatRwandaPhone(e.target.value)
}
const pinDigits = ref(['', '', '', '', '', ''])
const pinVisible = ref(false)
const rememberMe = ref(true)
const loading = ref(false)
const error = ref('')
const showLanguageModal = ref(false)
const showForgotPinModal = ref(false)
const pinRefs = ref([])

const router = useRouter()
const authStore = useAuthStore()

const pin = computed(() => pinDigits.value.join(''))

onMounted(() => {
  if (typeof navigator !== 'undefined' && !navigator.onLine && !authStore.isAuthenticated) {
    router.replace({ name: 'offline', query: { redirect: '/auth/login' } })
  }
})

function setPinRef(el, i) {
  if (el) pinRefs.value[i] = el
}

function onPinInput(i, e) {
  const raw = e.target.value.replace(/\D/g, '')
  if (!raw) {
    pinDigits.value[i] = ''
    return
  }
  // Handle paste of multiple digits landing in one box
  const chars = raw.split('')
  chars.forEach((c, offset) => {
    const idx = i + offset
    if (idx < 6) pinDigits.value[idx] = c
  })
  const nextIdx = Math.min(i + chars.length, 5)
  nextTick(() => {
    if (pinDigits.value[nextIdx] === '' || nextIdx === i + chars.length) {
      pinRefs.value[nextIdx]?.focus()
    }
  })
}

function onPinKeydown(i, e) {
  if (e.key === 'Backspace' && !pinDigits.value[i] && i > 0) {
    pinDigits.value[i - 1] = ''
    nextTick(() => pinRefs.value[i - 1]?.focus())
  } else if (e.key === 'ArrowLeft' && i > 0) {
    pinRefs.value[i - 1]?.focus()
  } else if (e.key === 'ArrowRight' && i < 5) {
    pinRefs.value[i + 1]?.focus()
  }
}

async function login() {
  error.value = ''
  const compactPhone = toCompactPhone(phone.value)
  if (!compactPhone || pin.value.length < 4) {
    error.value = t('login.error')
    return
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    router.push({ name: 'offline', query: { redirect: '/auth/login' } })
    return
  }
  loading.value = true
  try {
    const success = await authStore.login(compactPhone, pin.value)
    if (success) {
      router.replace(authStore.isAdminRole ? { name: 'admin-dashboard' } : { name: 'caregiver-dashboard' })
    } else {
      error.value = authStore.error || t('login.invalidLogin')
    }
  } catch (e) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      router.push({ name: 'offline', query: { redirect: '/auth/login' } })
    } else {
      error.value = authStore.error || t('login.invalidLogin')
    }
  } finally {
    loading.value = false
  }
}

async function installApp() {
  await promptInstall()
}
</script>

<template>
  <div
    class="min-h-screen bg-primary-500 flex flex-col"
    :key="'login-' + localeKey"
  >
    <!-- Top zone: brand + greeting, grounded in the page (not a floating card) -->
    <div
      class="relative overflow-hidden bg-primary-500 px-6 pb-16"
      style="padding-top: calc(2.5rem + env(safe-area-inset-top))"
    >
     

      <div class="relative flex items-start justify-between">
        <div class="w-12 h-12 rounded-md bg-white shadow-raised overflow-hidden flex items-center justify-center flex-shrink-0">
          <img src="/icons/icon.jpeg" alt="ERIS MES" class="w-full h-full object-cover" />
        </div>

        <button
          type="button"
          class="flex items-center gap-1.5 text-white/90 text-xs font-semibold bg-white/10 rounded-full pl-2.5 pr-2.5 py-1.5"
          @click="showLanguageModal = true"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 000 18M12.5 3a17 17 0 010 18" />
          </svg>
          <span>{{ locale.toUpperCase() }}</span>
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      <h1 class="relative font-display font-bold text-[1.7rem] text-white leading-tight mt-7">
        {{ t('login.welcomeBack') }}
      </h1>
      <p class="relative text-primary-100 text-sm mt-1.5">{{ t('login.signInToContinue') }}</p>

      <div class="relative inline-flex items-center gap-1.5 mt-4 bg-white/10 rounded-full pl-2 pr-3 py-1">
        <span class="w-1.5 h-1.5 rounded-full bg-accent-400"></span>
        <span class="text-white/85 text-xs font-medium">{{ t('login.offlineReady') }}</span>
      </div>
    </div>

    <!-- Form zone -->
    <div class="flex-1 bg-surface px-6 -mt-5 rounded-t-[28px] pt-0.5">
      <div class="bg-surface-raised rounded-3xl shadow-raised px-5 pt-6 pb-5 -mt-5 relative z-10">
        <form class="space-y-5" @submit.prevent="login">
          <!-- Phone -->
          <div>
            <label for="login-phone" class="block text-sm font-semibold text-ink mb-1.5">
              {{ t('login.phone') }}
            </label>
            <div
              class="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-3.5 h-touch-lg focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 transition-colors"
            >
              <svg class="w-5 h-5 text-ink-faint flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a2.25 2.25 0 002.25-2.25v-1.372a1.5 1.5 0 00-1.06-1.437l-4.145-1.383a1.5 1.5 0 00-1.657.446l-.804 1.005a11.25 11.25 0 01-6.364-6.364l1.005-.804a1.5 1.5 0 00.446-1.657L7.058 3.06a1.5 1.5 0 00-1.437-1.06H4.25A2.25 2.25 0 002 4.25v2.5z" />
              </svg>
              <input
                id="login-phone"
                :value="phone"
                type="tel"
                inputmode="numeric"
                pattern="[0-9\s+]*"
                autocomplete="tel"
                maxlength="17"
                :placeholder="t('login.phonePlaceholder')"
                class="w-full bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none"
                @input="onPhoneInput"
                @keydown="blockNonDigitKey"
              />
              <svg
                v-if="phone.replace(/\D/g, '').length >= 12"
                class="w-5 h-5 text-success-500 flex-shrink-0"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <!-- PIN -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-sm font-semibold text-ink">{{ t('login.pin') }}</label>
              <button
                type="button"
                class="text-xs font-medium text-ink-faint flex items-center gap-1"
                @click="pinVisible = !pinVisible"
              >
                <svg v-if="pinVisible" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
                <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {{ pinVisible ? t('login.hidePin') : t('login.showPin') }}
              </button>
            </div>

            <div class="flex gap-2" dir="ltr">
              <input
                v-for="(d, i) in pinDigits"
                :key="i"
                :ref="el => setPinRef(el, i)"
                v-model="pinDigits[i]"
                :type="pinVisible ? 'text' : 'password'"
                inputmode="numeric"
                maxlength="1"
                autocomplete="one-time-code"
                class="w-full h-14 text-center text-xl font-semibold rounded-xl border border-border bg-surface text-ink focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-colors"
                :class="d ? 'border-primary-300' : ''"
                @input="onPinInput(i, $event)"
                @keydown="onPinKeydown(i, $event)"
              />
            </div>
            <p class="text-xs text-ink-faint mt-1.5">{{ t('login.pinHint') }}</p>
          </div>

          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2 text-sm text-ink-soft cursor-pointer select-none">
              <input v-model="rememberMe" type="checkbox" class="w-4 h-4 rounded accent-primary-500" />
              {{ t('login.rememberMe') }}
            </label>
            <button type="button" class="text-sm font-semibold text-accent-600" @click="showForgotPinModal = true">
              {{ t('login.forgotPin') }}
            </button>
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

          <BaseButton type="submit" variant="primary" size="lg" full-width :loading="loading" class="!rounded-2xl">
            {{ t('login.signIn') }}
          </BaseButton>
        </form>

        <button
          v-if="isInstallable && !isInstalled"
          type="button"
          class="w-full flex items-center justify-center gap-2 mt-4 h-touch rounded-2xl border-2 border-primary-500 text-primary-500 font-semibold text-sm active:bg-primary-50 disabled:opacity-70"
          :disabled="installing"
          @click="installApp"
        >
          <svg v-if="!installing" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v13m0 0l-4-4m4 4l4-4M5 21h14" />
          </svg>
          <svg v-else class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {{ installing ? (t('pwa.installing') || 'Installing…') : (t('pwa.installApp') || 'Install app') }}
        </button>
      </div>

      <div class="h-8"></div>
    </div>


    <LanguageModal v-model="showLanguageModal" />
    <ForgotPinModal v-model="showForgotPinModal" :initial-phone="phone" />
  </div>
</template>
