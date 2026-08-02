<script setup>
import { onMounted, ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppTopBar from '@/components/layout/AppTopBar.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import FormField from '@/components/forms/FormField.vue'
import PhotoCapture from '@/components/forms/PhotoCapture.vue'
import LanguageModal from '@/components/ui/LanguageModal.vue'
import HelpSupportModal from '@/components/ui/HelpSupportModal.vue'
import SyncSettingsModal from '@/components/ui/SyncSettingsModal.vue'
import { useI18n, refreshKey } from '@/i18n/index.js'
import { formatRwandaPhone, toCompactPhone, blockNonDigitKey } from '@/composables/usePhoneFormat.js'
import { resolveMediaUrl } from '@/utils/mediaUrl.js'

const authStore = useAuthStore()
const router = useRouter()
const displayAvatarUrl = computed(() => resolveMediaUrl(authStore.user?.avatarUrl))
// authStore.user.center is a populated { name, district } object once the
// backend `.populate('center', ...)` runs — but right after login (and in
// any older cached session) it can still be a raw Mongo ObjectId string.
// Never render that raw id; show a friendly placeholder instead and let the
// background fetchCurrentUser() call fill in the real name.
const isMongoObjectId = (val) => typeof val === 'string' && /^[a-f0-9]{24}$/i.test(val)
const centerDisplayName = computed(() => {
  const center = authStore.user?.center
  if (center && typeof center === 'object' && center.name) return center.name
  if (typeof center === 'string' && !isMongoObjectId(center)) return center
  return t('profile.centerUnavailable')
})
const loading = ref(false)
const darkMode = ref(document.documentElement.classList.contains('dark'))
const { t } = useI18n()

onMounted(async () => {
  if (!authStore.user) await authStore.fetchCurrentUser()
})

function toggleDarkMode() {
  darkMode.value = !darkMode.value
  document.documentElement.classList.toggle('dark', darkMode.value)
  localStorage.setItem('ecd_dark_mode', darkMode.value ? '1' : '0')
}

// ---- Edit profile modal ----
const showEditModal = ref(false)
const savingProfile = ref(false)
const profileError = ref('')
const profileForm = reactive({ name: '', phone: '' })

function openEditProfile() {
  profileForm.name = authStore.user?.name || ''
  profileForm.phone = formatRwandaPhone(authStore.user?.phone || '')
  profileError.value = ''
  showEditModal.value = true
}

function onProfilePhoneInput(e) {
  profileForm.phone = formatRwandaPhone(e.target.value)
}

async function saveProfile() {
  if (!profileForm.name.trim()) {
    profileError.value = t('profile.nameRequired')
    return
  }
  savingProfile.value = true
  profileError.value = ''
  try {
    const ok = await authStore.updateProfile({
      name: profileForm.name.trim(),
      phone: toCompactPhone(profileForm.phone),
    })
    if (ok) {
      showEditModal.value = false
    } else {
      profileError.value = authStore.error || t('profile.couldNotSave')
    }
  } finally {
    savingProfile.value = false
  }
}

// ---- Profile photo modal ----
const showPhotoModal = ref(false)
const photoSaving = ref(false)
const capturedPhoto = ref(null)

function openPhotoModal() {
  capturedPhoto.value = null
  showPhotoModal.value = true
}

function onPhotoCaptured(dataUrl, blob) {
  capturedPhoto.value = dataUrl
  capturedBlob.value = blob
}

const capturedBlob = ref(null)

async function savePhoto(retryCount = 0) {
  if (!capturedPhoto.value) return
  photoSaving.value = true
  try {
    // Try blob upload first for efficiency
    if (capturedBlob.value) {
      const formData = new FormData()
      formData.append('photo', capturedBlob.value, 'avatar.jpg')
      const { apiClient } = await import('@/services/api/client.js')
      const resp = await apiClient._rawPost('/upload/avatar', formData)
      if (resp?.url) {
        await authStore.updateProfile({ avatarUrl: resp.url })
        showPhotoModal.value = false
        return
      }
    }
    // Fallback to dataURL
    await authStore.updateProfile({ avatarUrl: capturedPhoto.value })
    showPhotoModal.value = false
  } catch {
    if (retryCount < 2) {
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)))
      return savePhoto(retryCount + 1)
    }
  } finally {
    photoSaving.value = false
  }
}

// ---- Language modal ----
const showLanguageModal = ref(false)

// ---- Sync settings modal ----
const showSyncModal = ref(false)

// ---- Help & support modal ----
const showHelpModal = ref(false)

// ---- Sign out confirmation ----
const showLogoutModal = ref(false)
const loggingOut = ref(false)

async function confirmLogout() {
  loggingOut.value = true
  try {
    await authStore.logout()
    showLogoutModal.value = false
    router.replace({ name: 'login' })
  } finally {
    loggingOut.value = false
  }
}

function onMenuItemClick(item) {
  if (item.action) item.action()
}

const menuItems = computed(() => [
  { label: t('profile.editProfile'), icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', action: openEditProfile },
  { label: t('profile.language'), icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129', action: () => { showLanguageModal.value = true } },
  { label: t('profile.syncSettings'), icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', action: () => { showSyncModal.value = true } },
  { label: t('profile.helpSupport'), icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', action: () => { showHelpModal.value = true } },
])

function userInitials() {
  const name = authStore.user?.name || ''
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '—'
}

// Expose refreshKey for language change reactivity
const localeKey = refreshKey
</script>

<template>
  <div :key="'profile-' + localeKey">
    <AppTopBar :title="t('profile.title')" />

    <main class="px-4 pt-4 pb-8 space-y-5">
      <!-- User card with photo -->
      <BaseCard class="flex items-center gap-4">
        <div class="relative flex-shrink-0 cursor-pointer" @click="openPhotoModal">
          <img
            v-if="displayAvatarUrl"
            :src="displayAvatarUrl"
            :alt="authStore.user?.name"
            class="w-16 h-16 rounded-full object-cover"
          />
          <div
            v-else
            class="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-white font-display font-bold text-xl"
          >
            {{ userInitials() }}
          </div>
          <span
            v-if="!displayAvatarUrl"
            class="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-sm"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-display font-semibold text-ink truncate">{{ authStore.user?.name || '—' }}</p>
          <p class="text-sm text-ink-soft truncate">{{ centerDisplayName }}</p>
          <p class="text-xs text-ink-faint mt-0.5">{{ authStore.user?.phone }}</p>
        </div>
        <button
          class="text-xs font-semibold text-primary-500 flex-shrink-0"
          @click="openEditProfile"
        >
          {{ t('common.edit') }}
        </button>
      </BaseCard>

      <!-- Menu -->
      <BaseCard :padded="false">
        <button
          v-for="item in menuItems"
          :key="item.label"
          class="w-full flex items-center gap-3 p-3.5 border-b border-border/60 last:border-0 active:bg-surface-sunken/50"
          @click="onMenuItemClick(item)"
        >
          <svg class="w-5 h-5 text-ink-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
          </svg>
          <span class="text-sm font-medium text-ink flex-1 text-left">{{ item.label }}</span>
          <svg class="w-4 h-4 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </BaseCard>

      <BaseButton variant="outline" full-width class="!border-danger-500 !text-danger-600 active:!bg-danger-50" @click="showLogoutModal = true">
        <template #icon>
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </template>
        {{ t('profile.signOut') }}
      </BaseButton>
    </main>

    <!-- Edit profile modal -->
    <BaseModal v-model="showEditModal" :title="t('profile.editProfile')">
      <form class="space-y-4" @submit.prevent="saveProfile">
        <!-- Profile photo in edit modal -->
        <div class="flex items-center gap-4">
          <div class="relative flex-shrink-0 cursor-pointer" @click="showPhotoModal = true">
            <img
              v-if="displayAvatarUrl"
              :src="displayAvatarUrl"
              :alt="authStore.user?.name"
              class="w-16 h-16 rounded-full object-cover"
            />
            <div
              v-else
              class="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-white font-display font-bold text-xl"
            >
              {{ userInitials() }}
            </div>
            <span class="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-sm">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium text-ink">{{ t('profile.changePhoto') }}</p>
            <p class="text-xs text-ink-faint">{{ t('profile.photoHint') }}</p>
          </div>
        </div>
        <FormField :label="t('profile.fullName')" required>
          <input
            v-model="profileForm.name"
            type="text"
            :placeholder="t('profile.fullNamePlaceholder')"
            class="w-full h-touch-lg px-4 rounded-xl bg-surface border border-border text-base focus:border-primary-400"
          />
        </FormField>
        <FormField :label="t('profile.phoneNumber')">
          <input
            :value="profileForm.phone"
            type="tel"
            inputmode="numeric"
            pattern="[0-9\s+]*"
            maxlength="17"
            :placeholder="t('profile.phonePlaceholder')"
            class="w-full h-touch-lg px-4 rounded-xl bg-surface border border-border text-base focus:border-primary-400"
            @input="onProfilePhoneInput"
            @keydown="blockNonDigitKey"
          />
        </FormField>
        <p v-if="profileError" class="text-sm text-danger-600">{{ profileError }}</p>
      </form>
      <template #footer>
        <BaseButton variant="outline" full-width @click="showEditModal = false">{{ t('common.cancel') }}</BaseButton>
        <BaseButton variant="primary" full-width :loading="savingProfile" @click="saveProfile">{{ t('common.save') }}</BaseButton>
      </template>
    </BaseModal>

    <!-- Profile photo modal -->
    <BaseModal v-model="showPhotoModal" :title="t('profile.changePhoto')" size="sm">
      <div class="space-y-4">
        <PhotoCapture @captured="onPhotoCaptured" />
        <p class="text-xs text-ink-faint text-center">{{ t('children.photoHint') }}</p>
      </div>
      <template #footer>
        <BaseButton variant="outline" full-width @click="showPhotoModal = false">{{ t('common.cancel') }}</BaseButton>
        <BaseButton variant="primary" full-width :loading="photoSaving" :disabled="!capturedPhoto" @click="savePhoto">{{ t('children.savePhoto') }}</BaseButton>
      </template>
    </BaseModal>

    <!-- Language modal -->
    <LanguageModal v-model="showLanguageModal" />

    <!-- Sync settings modal -->
    <SyncSettingsModal v-model="showSyncModal" />

    <!-- Help & support modal -->
    <HelpSupportModal v-model="showHelpModal" role="caregiver" :title="t('profile.helpSupport')" />

    <!-- Sign out confirmation modal -->
    <BaseModal v-model="showLogoutModal" :title="t('profile.signOut')" size="sm">
      <p class="text-sm text-ink-soft">{{ t('profile.signOutConfirm') }}</p>
      <template #footer>
        <BaseButton variant="outline" full-width @click="showLogoutModal = false">{{ t('common.cancel') }}</BaseButton>
        <BaseButton variant="danger" full-width :loading="loggingOut" @click="confirmLogout">{{ t('profile.signOut') }}</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
