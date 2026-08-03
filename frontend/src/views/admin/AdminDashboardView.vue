<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useDashboardStore } from '@/stores/dashboard'
import { getHealthAlerts } from '@/services/api/records.service'
import AdminTopBar from '@/components/layout/AdminTopBar.vue'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import AttendanceTrendChart from '@/components/charts/AttendanceTrendChart.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { resolveMediaUrl } from '@/utils/mediaUrl.js'

const router = useRouter()
const store = useDashboardStore()
const { loading, adminSummary } = storeToRefs(store)
const recentAlerts = ref([])
const trendRange = ref('7d')
const trendRangeOptions = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'quarter', label: 'This quarter' },
  { value: '1y', label: 'This year' },
]

function initials(name) {
  return (name || '').split(' ').map((n) => n[0]).slice(0, 2).join('')
}

// ---- Alert detail modal (mirrors caregiver Children page card/detail pattern) ----
const showAlertModal = ref(false)
const activeAlert = ref(null)
function openAlertDetail(alert) {
  activeAlert.value = alert
  showAlertModal.value = true
}
function goToAlertsPage() {
  showAlertModal.value = false
  router.push({ name: 'admin-alerts' })
}

function loadDashboard() {
  store.loadAdminDashboard({ range: trendRange.value })
}

// Re-fetch chart data when range changes
watch(trendRange, () => loadDashboard())

onMounted(async () => {
  loadDashboard()
  if (!recentAlerts.value.length) {
    try {
      recentAlerts.value = (await getHealthAlerts())
        .filter(a => a.status !== 'resolved')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
    } catch { /* alerts will remain empty */ }
  }
})
</script>

<template>
  <div>
    <AdminTopBar title="Overview" />

    <main class="p-4 md:p-6 space-y-6 max-w-[1600px]">
      <!-- KPI grid -->
      <div v-if="loading" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonBlock v-for="i in 4" :key="i" height="8.5rem" rounded="rounded-card" />
      </div>
      <div v-else-if="adminSummary" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total children" :value="adminSummary.totalChildren.toLocaleString()" delta="" tone="primary">
          <template #icon>
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4" />
            </svg>
          </template>
        </KpiCard>
        <KpiCard label="caregivers" :value="adminSummary.totalCaregivers" delta="" tone="success">
          <template #icon>
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </template>
        </KpiCard>
        <KpiCard label="attendance" :value="`${adminSummary.todayAttendanceRate}%`" delta="" tone="accent">
          <template #icon>
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </template>
        </KpiCard>
        <KpiCard label="health alerts" :value="adminSummary.activeAlerts" delta="" delta-tone="success" tone="danger">
          <template #icon>
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </template>
        </KpiCard>
      </div>

      <!-- Chart + centers panel -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BaseCard class="lg:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="font-display font-semibold text-ink">Attendance</h3>
              <p class="text-xs text-ink-faint">All centers</p>
            </div>
            <div class="w-40 flex-shrink-0">
              <BaseSelect v-model="trendRange" :options="trendRangeOptions" size="sm" />
            </div>
          </div>
          <AttendanceTrendChart
            v-if="adminSummary"
            :labels="adminSummary.attendanceTrendLabels"
            :data="adminSummary.attendanceTrend"
            :loading="loading"
          />
        </BaseCard>

        <BaseCard>
          <h3 class="font-display font-semibold text-ink mb-4">Pending approvals</h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-ink-soft">Reports awaiting review</span>
              <BaseBadge tone="warning">{{ adminSummary?.pendingReports ?? '—' }}</BaseBadge>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-ink-soft">Centers</span>
              <BaseBadge tone="info">{{ adminSummary?.totalCenters ?? '—' }}</BaseBadge>
            </div>
          </div>
          <button
            class="w-full mt-4 h-11 rounded-lg bg-primary-500 text-sm font-bold text-white hover:bg-primary-600 transition-colors"
            @click="router.push({ name: 'admin-reports' })"
          >
            Review reports
          </button>
          <button
            class="w-full mt-2 h-11 rounded-lg border-2 border-border text-sm font-bold text-ink-soft hover:bg-surface-sunken transition-colors"
            @click="loadDashboard"
          >
            <svg class="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh
          </button>
        </BaseCard>
      </div>

      <!-- Recent alerts (card style, matching caregiver Children page) -->
      <BaseCard :padded="false">
        <div class="p-5 pb-3 flex items-center justify-between">
          <h3 class="font-display font-semibold text-ink">Recent health alerts</h3>
          <button class="text-sm font-medium text-primary-600" @click="router.push({ name: 'admin-alerts' })">View all</button>
        </div>
        <div class="px-5 pb-5 space-y-2.5">
          <template v-if="recentAlerts.length">
            <BaseCard
              v-for="alert in recentAlerts"
              :key="alert.id"
              interactive
              class="flex items-center gap-3"
              @click="openAlertDetail(alert)"
            >
              <div class="relative flex-shrink-0">
                <img
                  v-if="alert.child?.photoUrl"
                  :src="resolveMediaUrl(alert.child.photoUrl)"
                  :alt="alert.child?.name"
                  class="w-12 h-12 rounded-full object-cover"
                />
                <div
                  v-else
                  class="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600 font-display font-semibold"
                >
                  {{ initials(alert.child?.name || '?') }}
                </div>
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-medium text-ink truncate">{{ alert.child?.name || 'Unknown child' }}</p>
                <p class="text-xs text-ink-soft truncate">{{ (typeof alert.child?.center === 'object' ? alert.child?.center?.name : null) || '—' }} · {{ alert.title }}</p>
              </div>
              <BaseBadge :tone="alert.severity === 'high' || alert.severity === 'critical' ? 'danger' : 'warning'">
                {{ alert.severity }}
              </BaseBadge>
            </BaseCard>
          </template>
          <div v-else class="py-6 text-center">
            <p class="text-sm text-ink-faint">No health alerts</p>
          </div>
        </div>
      </BaseCard>
    </main>

    <!-- Alert detail modal -->
    <BaseModal v-model="showAlertModal" :title="activeAlert?.child?.name || 'Health alert'">
      <div v-if="activeAlert" class="space-y-4">
        <div class="flex items-center gap-3">
          <div class="relative flex-shrink-0">
            <img
              v-if="activeAlert.child?.photoUrl"
              :src="resolveMediaUrl(activeAlert.child.photoUrl)"
              :alt="activeAlert.child?.name"
              class="w-14 h-14 rounded-full object-cover"
            />
            <div
              v-else
              class="w-14 h-14 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600 font-display font-semibold text-lg"
            >
              {{ initials(activeAlert.child?.name || '?') }}
            </div>
          </div>
          <div class="min-w-0">
            <p class="font-medium text-ink truncate">{{ activeAlert.child?.name || 'Unknown child' }}</p>
            <p class="text-xs text-ink-soft">{{ (typeof activeAlert.child?.center === 'object' ? activeAlert.child?.center?.name : null) || '—' }}</p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p class="text-xs text-ink-faint">Alert</p>
            <p class="text-ink font-medium">{{ activeAlert.title }}</p>
          </div>
          <div>
            <p class="text-xs text-ink-faint">Severity</p>
            <BaseBadge :tone="activeAlert.severity === 'high' || activeAlert.severity === 'critical' ? 'danger' : 'warning'">
              {{ activeAlert.severity }}
            </BaseBadge>
          </div>
        </div>
        <div v-if="activeAlert.notes || activeAlert.description">
          <p class="text-xs text-ink-faint mb-1">Notes</p>
          <p class="text-sm text-ink">{{ activeAlert.notes || activeAlert.description }}</p>
        </div>
        <div class="flex gap-3 pt-2">
          <button
            class="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-ink-soft hover:bg-surface-sunken"
            @click="showAlertModal = false"
          >
            Close
          </button>
          <button
            class="flex-1 h-11 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600"
            @click="goToAlertsPage"
          >
            Open in Health Alerts
          </button>
        </div>
      </div>
    </BaseModal>
  </div>
</template>
