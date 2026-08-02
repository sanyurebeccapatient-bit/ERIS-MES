<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/i18n/index.js'
import { resolveMediaUrl } from '@/utils/mediaUrl.js'

defineProps({
  title: { type: String, default: '' },
  showBack: { type: Boolean, default: false },
})
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { t } = useI18n()

const isOnProfile = computed(() => route.name === 'profile')

const avatarUrl = computed(() => resolveMediaUrl(authStore.user?.avatarUrl))

// Last name = the last word after the final space of the user's full name,
// e.g. "Mugisha Tumusifu Chretien" -> "Chretien".
const lastName = computed(() => {
  const name = authStore.user?.name?.trim()
  if (!name) return ''
  const parts = name.split(/\s+/)
  return parts[parts.length - 1]
})

const initials = computed(() => {
  const name = authStore.user?.name
  if (!name) return ''
  return name.split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase()
})

function goToProfile() {
  if (!isOnProfile.value) router.push({ name: 'profile' })
}
</script>

<template>
  <header class="sticky top-0 z-30 bg-surface/90 backdrop-blur-sm border-b border-border safe-area-top">
    <div class="flex items-center justify-between h-14 px-3">
      <div class="flex items-center gap-1 min-w-0">
        <button
          v-if="showBack"
          class="touch-target -ml-2"
          aria-label="Go back"
          @click="router.back()"
        >
          <svg class="w-6 h-6 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="font-display font-semibold text-lg text-ink truncate">{{ title }}</h1>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0 relative" data-topbar-account>
        <button
          class="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full border border-border active:bg-surface-sunken/70 transition-colors"
          :aria-label="`${t('nav.home')}: ${lastName || t('profile.title')}`"
          @click="goToProfile"
        >
          <span
            class="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-display font-semibold flex-shrink-0 ring-2 ring-offset-1 ring-offset-surface"
            :class="[isOnProfile ? 'ring-primary-400' : 'ring-border', avatarUrl ? 'p-0 overflow-hidden' : 'bg-primary-500']"
            :style="avatarUrl ? 'background-image: url(' + avatarUrl + '); background-size: cover; background-position: center;' : ''"
          >
            <span v-if="initials && !avatarUrl">{{ initials }}</span>
            <svg v-else-if="!avatarUrl" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </span>
          <span v-if="lastName" class="text-sm font-medium text-ink max-w-[6rem] truncate">{{ lastName }}</span>
        </button>
      </div>
    </div>
  </header>
</template>


