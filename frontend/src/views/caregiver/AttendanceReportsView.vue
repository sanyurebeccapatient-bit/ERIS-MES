<script setup>
import { onMounted, ref } from 'vue'
import { listMyReports } from '@/services/api/records.service'
import { useI18n, refreshKey } from '@/i18n/index.js'
import AppTopBar from '@/components/layout/AppTopBar.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { translateAttendanceSummaryTitle, translateAttendanceSummaryNotes } from '@/utils/attendanceSummary.js'
import { resolveMediaUrl } from '@/utils/mediaUrl.js'

const { t } = useI18n()
const loading = ref(true)
const reports = ref([])
const errorMessage = ref('')

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    reports.value = await listMyReports({ reportType: 'attendance' })
  } catch (e) {
    errorMessage.value = e.message || t('common.error')
  } finally {
    loading.value = false
  }
}

onMounted(load)

// Normalizes fields that differ between the mock API (flat strings) and the
// real backend (populated refs / arrays), so the template stays simple.
function photoOf(report) {
  if (report.photo) return resolveMediaUrl(report.photo)
  if (Array.isArray(report.photoUrls) && report.photoUrls.length) return resolveMediaUrl(report.photoUrls[0])
  return null
}

function isRawObjectId(value) {
  return typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value)
}

function submittedByOf(report) {
  if (report.submittedBy?.name) return report.submittedBy.name
  if (report.submittedBy && !isRawObjectId(report.submittedBy)) return report.submittedBy
  return ''
}

function childNameOf(report) {
  if (report.child?.name) return report.child.name
  return translateAttendanceSummaryTitle(report.childNameFreeText, t)
}

function notesOf(report) {
  return translateAttendanceSummaryNotes(report.notes, t)
}

const statusTone = { submitted: 'info', under_review: 'warning', approved: 'success', rejected: 'danger', draft: 'neutral' }
const statusText = { submitted: 'Submitted', under_review: 'Under review', approved: 'Approved', rejected: 'Rejected', draft: 'Draft' }
function statusLabel(status) {
  return statusText[status] || (status || '').replace('_', ' ')
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// ---- Photo lightbox ----
const showPhotoModal = ref(false)
const activePhoto = ref(null)
function openPhoto(url) {
  activePhoto.value = url
  showPhotoModal.value = true
}

const localeKey = refreshKey
</script>

<template>
  <div :key="'attendance-reports-' + localeKey">
    <AppTopBar :title="t('attendance.reportsTitle')" show-back />

    <main class="px-4 pt-4 pb-8 space-y-4">
      <p class="text-sm text-ink-soft">{{ t('attendance.reportsDesc') }}</p>

      <p v-if="errorMessage" class="text-sm text-danger-600">{{ errorMessage }}</p>

      <div v-if="loading" class="space-y-2.5">
        <SkeletonBlock v-for="i in 4" :key="i" height="7rem" rounded="rounded-card" />
      </div>

      <div v-else-if="reports.length" class="space-y-2.5">
        <BaseCard v-for="report in reports" :key="report.id" class="flex gap-3">
          <button
            v-if="photoOf(report)"
            class="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-border"
            :aria-label="t('attendance.evidencePhoto')"
            @click="openPhoto(photoOf(report))"
          >
            <img :src="photoOf(report)" alt="" class="w-full h-full object-cover" />
          </button>
          <div v-else class="w-16 h-16 rounded-xl bg-surface-sunken flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <p class="text-sm font-medium text-ink truncate">{{ childNameOf(report) || t('attendance.title') }}</p>
              <BaseBadge :tone="statusTone[report.status] || 'neutral'">{{ statusLabel(report.status) }}</BaseBadge>
            </div>
            <p class="text-xs text-ink-soft mt-1 line-clamp-2">{{ notesOf(report) }}</p>
            <p class="text-xs text-ink-faint mt-1.5">
              {{ formatDate(report.createdAt) }}<span v-if="submittedByOf(report)"> · {{ submittedByOf(report) }}</span>
            </p>
          </div>
        </BaseCard>
      </div>

      <EmptyState
        v-else
        :title="t('attendance.noReports')"
        :message="t('attendance.noReportsDesc')"
      />
    </main>

    <!-- Photo lightbox -->
    <BaseModal v-model="showPhotoModal" :title="t('attendance.evidencePhoto')" size="md">
      <img v-if="activePhoto" :src="activePhoto" alt="" class="w-full rounded-xl object-contain max-h-[70vh]" />
    </BaseModal>
  </div>
</template>
