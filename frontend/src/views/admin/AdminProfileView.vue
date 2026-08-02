<script setup>
import { onMounted, ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AdminTopBar from '@/components/layout/AdminTopBar.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import FormField from '@/components/forms/FormField.vue'
import PhotoCapture from '@/components/forms/PhotoCapture.vue'
import HelpSupportModal from '@/components/ui/HelpSupportModal.vue'
import { formatRwandaPhone, toCompactPhone, blockNonDigitKey } from '@/composables/usePhoneFormat.js'
import { resolveMediaUrl } from '@/utils/mediaUrl.js'

const authStore = useAuthStore()
const router = useRouter()
const displayAvatarUrl = computed(() => resolveMediaUrl(authStore.user?.avatarUrl))
const darkMode = ref(document.documentElement.classList.contains('dark'))
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
  return 'Center not assigned'
})

onMounted(async () => {
  if (!authStore.user) await authStore.fetchCurrentUser()
})

function toggleDarkMode() {
  darkMode.value = !darkMode.value
  document.documentElement.classList.toggle('dark', darkMode.value)
  localStorage.setItem('ecd_dark_mode', darkMode.value ? '1' : '0')
}

const roleLabels = {
  admin: 'Administrator',
  supervisor: 'Supervisor',
  center_manager: 'Center manager',
  field_officer: 'Field officer',
  caregiver: 'Caregiver',
}
const roleLabel = computed(() => roleLabels[authStore.user?.role] || authStore.user?.role || '—')

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
    profileError.value = 'Full name is required.'
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
      profileError.value = authStore.error || 'Could not save your profile. Please try again.'
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

const capturedBlob = ref(null)

function onPhotoCaptured(dataUrl, blob) {
  capturedPhoto.value = dataUrl
  capturedBlob.value = blob
}

async function savePhoto(retryCount = 0) {
  if (!capturedPhoto.value) return
  photoSaving.value = true
  try {
    // Try blob upload first so we store a real server URL, not a raw data URL
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
  { label: 'Edit profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', action: openEditProfile },
  { label: 'Manage centers', icon: 'M3 21h18M5 21V7l8-4v18M19 21V11l-6-4', action: () => router.push({ name: 'admin-centers' }) },
  { label: 'Audit log', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', action: () => router.push({ name: 'admin-audit' }) },
  { label: 'Help & support', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', action: () => { showHelpModal.value = true } },
])

function userInitials() {
  const name = authStore.user?.name || ''
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '—'
}
</script>

<template>
  <div>
    <AdminTopBar title="Profile" />

    <main class="px-4 pt-4 pb-8 md:px-6 space-y-5 max-w-[720px]">
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
          <div class="flex items-center gap-2 mt-0.5">
            <BaseBadge tone="info">{{ roleLabel }}</BaseBadge>
            <p class="text-sm text-ink-soft truncate">{{ centerDisplayName }}</p>
          </div>
          <p class="text-xs text-ink-faint mt-0.5">{{ authStore.user?.phone }}</p>
        </div>
        <button
          class="text-xs font-semibold text-primary-500 flex-shrink-0"
          @click="openEditProfile"
        >
          Edit
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

      <!-- Preferences -->
      <BaseButton variant="outline" full-width class="!border-danger-500 !text-danger-600 active:!bg-danger-50" @click="showLogoutModal = true">
        <template #icon>
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </template>
        Sign out
      </BaseButton>
    </main>

    <!-- Edit profile modal -->
    <BaseModal v-model="showEditModal" title="Edit profile">
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
            <p class="text-sm font-medium text-ink">Change photo</p>
            <p class="text-xs text-ink-faint">Tap to update your profile picture</p>
          </div>
        </div>
        <FormField label="Full name" required>
          <input
            v-model="profileForm.name"
            type="text"
            placeholder="e.g. Grace Uwimana"
            class="w-full h-touch-lg px-4 rounded-xl bg-surface border border-border text-base focus:border-primary-400"
          />
        </FormField>
        <FormField label="Phone number">
          <input
            :value="profileForm.phone"
            type="tel"
            inputmode="numeric"
            pattern="[0-9\s+]*"
            maxlength="17"
            placeholder="+250 7__ ___ ___"
            class="w-full h-touch-lg px-4 rounded-xl bg-surface border border-border text-base focus:border-primary-400"
            @input="onProfilePhoneInput"
            @keydown="blockNonDigitKey"
          />
        </FormField>
        <p v-if="profileError" class="text-sm text-danger-600">{{ profileError }}</p>
      </form>
      <template #footer>
        <BaseButton variant="outline" full-width @click="showEditModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" full-width :loading="savingProfile" @click="saveProfile">Save</BaseButton>
      </template>
    </BaseModal>

    <!-- Profile photo modal -->
    <BaseModal v-model="showPhotoModal" title="Change photo" size="sm">
      <div class="space-y-4">
        <PhotoCapture @captured="onPhotoCaptured" />
        <p class="text-xs text-ink-faint text-center">A clear, front-facing photo works best.</p>
      </div>
      <template #footer>
        <BaseButton variant="outline" full-width @click="showPhotoModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" full-width :loading="photoSaving" :disabled="!capturedPhoto" @click="savePhoto">Save photo</BaseButton>
      </template>
    </BaseModal>

    <!-- Sign out confirmation modal -->
    <BaseModal v-model="showLogoutModal" title="Sign out" size="sm">
      <p class="text-sm text-ink-soft">Are you sure you want to sign out?</p>
      <template #footer>
        <BaseButton variant="outline" full-width @click="showLogoutModal = false">Cancel</BaseButton>
        <BaseButton variant="danger" full-width :loading="loggingOut" @click="confirmLogout">Sign out</BaseButton>
      </template>
    </BaseModal>

    <!-- Help & support modal -->
    <HelpSupportModal v-model="showHelpModal" role="admin" title="Help & support" />
  </div>
</template>
