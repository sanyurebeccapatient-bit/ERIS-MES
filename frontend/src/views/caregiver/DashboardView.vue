<script setup>
import { onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useDashboardStore } from '@/stores/dashboard'
import { useAuthStore } from '@/stores/auth'
import { useI18n, refreshKey } from '@/i18n/index.js'
import AppTopBar from '@/components/layout/AppTopBar.vue'
import StatTile from '@/components/dashboard/StatTile.vue'
import VisitItem from '@/components/dashboard/VisitItem.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useRouter } from 'vue-router'

const store = useDashboardStore()
const authStore = useAuthStore()
const { loading, summary, upcomingVisits, healthAlerts } = storeToRefs(store)
const router = useRouter()
const { t } = useI18n()

onMounted(() => store.loadCaregiverDashboard())

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return t('dashboard.goodMorning')
  if (h < 17) return t('dashboard.goodAfternoon')
  return t('dashboard.goodEvening')
})

const today = computed(() =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
)

// Expose refreshKey for language change reactivity
const localeKey = refreshKey

// Helper to translate health alert severity
function translateAlertTitle(alert) {
  if (alert.severity) {
    const key = 'children.' + alert.severity
    const translated = t(key)
    // If we have a translation for the severity, use it
    if (translated !== key) return translated
  }
  return alert.title || ''
}

function translateAlertDetail(alert) {
  if (alert.autoDerived && alert.child?.name) {
    return t('children.healthFlag') + ' — ' + alert.child.name
  }
  return alert.detail || ''
}
</script>

<template>
  <div :key="'dashboard-' + localeKey">
    <AppTopBar :title="t('nav.home')" />

    <main class="px-4 pt-4 space-y-5">
      <!-- Greeting -->
      <div>
        <h2 class="font-display font-bold text-xl text-ink">{{ greeting }}, {{ authStore.user?.name?.trim()?.split(/\s+/)?.pop() || 'there' }}</h2>
        <p class="text-sm text-ink-soft">{{ today }}</p>
      </div>

      <!-- Quick report CTA -->
      <BaseCard class="!bg-primary-500 !border-0 flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-white font-display font-semibold">{{ t('dashboard.quickReport') }}</p>
          <p class="text-primary-100 text-xs mt-0.5">{{ t('dashboard.quickReportDesc') }}</p>
        </div>
        <BaseButton variant="accent" size="sm" @click="router.push({ name: 'new-report' })">
          {{ t('dashboard.start') }}
        </BaseButton>
      </BaseCard>

      <!-- Stats grid -->
      <section aria-label="Today's overview">
        <h3 class="text-sm font-semibold text-ink-soft mb-2.5">{{ t('dashboard.todayOverview') }}</h3>
        <div v-if="loading" class="grid grid-cols-2 gap-3">
          <SkeletonBlock v-for="i in 4" :key="i" height="6.5rem" rounded="rounded-card" />
        </div>
        <div v-else-if="summary" class="grid grid-cols-2 gap-3">
          <StatTile :label="t('dashboard.childrenAssigned')" :value="summary.childrenAssigned" tone="primary">
            <template #icon>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4" />
              </svg>
            </template>
          </StatTile>
          <StatTile :label="t('dashboard.presentToday')" :value="`${summary.attendanceToday.present}/${summary.attendanceToday.total}`" tone="success">
            <template #icon>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </template>
          </StatTile>
          <StatTile :label="t('dashboard.pendingVisits')" :value="summary.pendingVisits" tone="accent">
            <template #icon>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </template>
          </StatTile>
          <StatTile :label="t('dashboard.healthAlerts')" :value="summary.healthAlerts" tone="danger">
            <template #icon>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </template>
          </StatTile>
        </div>
      </section>

      <!-- Health alerts -->
      <section v-if="!loading && healthAlerts.length" aria-label="Health alerts">
        <div class="flex items-center justify-between mb-2.5">
          <h3 class="text-sm font-semibold text-ink-soft">{{ t('dashboard.healthAlerts') }}</h3>
          <BaseBadge tone="danger">{{ healthAlerts.length }}</BaseBadge>
        </div>
        <BaseCard :padded="false">
          <div
            v-for="alert in healthAlerts"
            :key="alert.id"
            class="flex items-start gap-3 p-3.5 border-b border-border/60 last:border-0"
          >
            <span
              class="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
              :class="alert.severity === 'high' ? 'bg-danger-500' : 'bg-accent-400'"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-ink">{{ translateAlertTitle(alert) }}</p>
              <p class="text-xs text-ink-soft mt-0.5">{{ translateAlertDetail(alert) }}</p>
            </div>
          </div>
        </BaseCard>
      </section>

      <!-- Upcoming visits -->
      <section aria-label="Upcoming visits">
        <div class="flex items-center justify-between mb-2.5">
          <h3 class="text-sm font-semibold text-ink-soft">{{ t('dashboard.upcomingVisits') }}</h3>
          <button class="text-xs font-semibold text-primary-500" @click="router.push({ name: 'visits' })">
            {{ t('dashboard.seeAll') }}
          </button>
        </div>
        <BaseCard v-if="loading" class="space-y-3">
          <SkeletonBlock v-for="i in 2" :key="i" height="3.5rem" />
        </BaseCard>
        <BaseCard v-else-if="upcomingVisits.length" :padded="false" class="px-3.5">
          <VisitItem v-for="visit in upcomingVisits" :key="visit.id" :visit="visit" />
        </BaseCard>
        <BaseCard v-else :padded="false">
          <EmptyState :title="t('dashboard.noVisits')" :message="t('dashboard.noVisitsDesc')" />
        </BaseCard>
      </section>

    </main>
  </div>
</template>
