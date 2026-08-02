<script setup>
import { onMounted, ref, computed } from 'vue'
import * as adminService from '@/services/api/admin.service'
import jsPDF from 'jspdf'
import autoTable, { applyPlugin } from 'jspdf-autotable'
import AdminTopBar from '@/components/layout/AdminTopBar.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ReportTypeIcon from '@/components/ui/ReportTypeIcon.vue'
import PillFilterButton from '@/components/ui/PillFilterButton.vue'
import { resolveMediaUrl } from '@/utils/mediaUrl.js'

// jspdf-autotable is meant to self-register onto the jsPDF prototype when
// imported, but depending on how the bundler resolves its internal
// require('jspdf'), that self-registration can silently no-op (causing
// "autoTable is not a function" / "doc.autoTable is not a function" at
// runtime). Applying the plugin explicitly here guarantees doc.autoTable
// exists regardless of how the import above was resolved.
try {
  applyPlugin(jsPDF)
} catch {
  // Keeps things safe if this export is ever unavailable in a future version.
}

const loading = ref(true)
const hasLoaded = ref(false)
const reports = ref([])
const filter = ref('')
const typeFilter = ref('')
const search = ref('')
const actingOn = ref(null)

const tabs = [
  { key: '', label: 'All' },
  { key: 'submitted', label: 'Pending' },
  { key: 'under_review', label: 'Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

const typeTabs = [
  { key: '', label: 'All types' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'health', label: 'Health' },
  { key: 'visit', label: 'Visit' },
  { key: 'general', label: 'General' },
]

let searchTimeout = null
function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(load, 300)
}

async function load() {
  // Only blank out to the skeleton on the very first load — filter changes
  // and searches after that update the list in place, no flash.
  if (!hasLoaded.value) loading.value = true
  try {
    const params = {}
    if (filter.value) params.status = filter.value
    if (typeFilter.value) params.reportType = typeFilter.value
    if (search.value.trim()) params.search = search.value.trim()
    reports.value = await adminService.listReports(params)
  } finally {
    loading.value = false
    hasLoaded.value = true
  }
}
onMounted(load)

const typeLabels = { attendance: 'Attendance issue', health: 'Health concern', visit: 'Home visit note', general: 'General report' }

// Normalizes fields that differ between the mock API (flat strings) and the
// real backend (populated refs / nested objects), so the template can stay simple.
function childNameOf(report) {
  if (report.child?.name) return report.child.name
  return decodeSummaryMarker(report.childNameFreeText) || 'Unknown child'
}
function submittedByOf(report) {
  if (report.submittedBy?.name) return report.submittedBy.name
  if (report.submittedBy && !isRawObjectId(report.submittedBy)) return report.submittedBy
  return 'Unknown'
}
// A raw Mongo ObjectId is a 24-character hex string — if a ref field wasn't
// populated (e.g. stale cached data), we never want to show that to the user.
function isRawObjectId(value) {
  return typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value)
}

function centerOf(report) {
  if (report.center?.name) return report.center.name
  if (report.center && !isRawObjectId(report.center)) return report.center
  return ''
}
function photoOf(report) {
  if (report.photo) return resolveMediaUrl(report.photo)
  if (Array.isArray(report.photoUrls) && report.photoUrls.length) return resolveMediaUrl(report.photoUrls[0])
  return null
}

// Older/offline-queued attendance reports may store a language-neutral
// summary marker (see utils/attendanceSummary.js) instead of plain text —
// decode it here into readable English for the admin (non-localized) view.
function decodeSummaryMarker(value) {
  if (typeof value !== 'string' || !value.startsWith('__ATTENDANCE_SUMMARY__:')) return value
  const raw = value.slice('__ATTENDANCE_SUMMARY__:'.length)
  const parts = {}
  for (const pair of raw.split(';')) {
    const [key, val] = pair.split('=')
    if (key) parts[key] = Number(val) || 0
  }
  return `Attendance — ${parts.present || 0} present, ${parts.absent || 0} absent of ${parts.total || 0}`
}
function notesOf(report) {
  return decodeSummaryMarker(report.notes)
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// ---- Photo lightbox ----
const showPhotoModal = ref(false)
const activePhoto = ref(null)
function openPhoto(url) {
  activePhoto.value = url
  showPhotoModal.value = true
}
async function act(report, status) {
  actingOn.value = report.id
  try {
    await adminService.reviewReport(report.id, { status })
    reports.value = reports.value.filter((r) => r.id !== report.id)
  } finally {
    actingOn.value = null
  }
}

// ---- Confirm modal for strong actions (approve / reject) ----
const showActionModal = ref(false)
const actionTarget = ref(null)
const actionStatus = ref(null)

function confirmAct(report, status) {
  actionTarget.value = report
  actionStatus.value = status
  showActionModal.value = true
}

async function performConfirmedAction() {
  if (!actionTarget.value || !actionStatus.value) return
  showActionModal.value = false
  await act(actionTarget.value, actionStatus.value)
}

const pendingCount = computed(() => reports.value.length)

const exporting = ref(false)

async function exportPDF() {
  exporting.value = true
  try {
    // Export based on the currently selected status/type filters — fetch
    // fresh so the PDF reflects the full filtered set, not just what's
    // currently rendered on screen (e.g. after a stale search).
    const params = {}
    if (filter.value) params.status = filter.value
    if (typeFilter.value) params.reportType = typeFilter.value
    if (search.value.trim()) params.search = search.value.trim()
    const data = await adminService.listReports(params)

    if (!data.length) {
      window.alert('There are no reports to export for the selected filters.')
      return
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    const statusLabel = filter.value
      ? tabs.find((t) => t.key === filter.value)?.label || filter.value.replace('_', ' ')
      : 'All statuses'
    const typeLabel = typeFilter.value ? typeLabels[typeFilter.value] || typeFilter.value : 'All types'

    doc.setFontSize(16)
    doc.setTextColor(15, 107, 92)
    doc.text('ERIS MES Reports', 40, 40)
    doc.setFontSize(10)
    doc.setTextColor(124, 133, 128)
    doc.text(`Status: ${statusLabel} \u00b7 Type: ${typeLabel}`, 40, 58)
    doc.text(`Generated: ${new Date().toLocaleString()} \u00b7 ${data.length} record${data.length === 1 ? '' : 's'}`, 40, 72)

    const rows = data.map((r) => [
      typeLabels[r.reportType] || r.reportType,
      childNameOf(r),
      centerOf(r) || '—',
      submittedByOf(r),
      (r.status || '').replace('_', ' '),
      notesOf(r) || '—',
      formatDate(r.createdAt),
    ])

    const autoTableOptions = {
      startY: 90,
      head: [['Type', 'Child', 'Center', 'Submitted By', 'Status', 'Notes', 'Date']],
      body: rows,
      styles: { fontSize: 8.5, cellPadding: 6, overflow: 'linebreak' },
      headStyles: { fillColor: [15, 107, 92], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 248, 245] },
      columnStyles: { 5: { cellWidth: 200 } },
      margin: { left: 40, right: 40 },
    }
    // jspdf-autotable registers itself onto the jsPDF prototype as a side
    // effect of being imported; depending on how the bundler resolves the
    // module, the named import itself may or may not be directly callable.
    // Try the plugin function first, then fall back to the instance method.
    if (typeof autoTable === 'function') {
      autoTable(doc, autoTableOptions)
    } else if (typeof doc.autoTable === 'function') {
      doc.autoTable(autoTableOptions)
    } else {
      throw new Error('PDF table renderer failed to load. Please refresh and try again.')
    }

    const fileSuffix = filter.value ? filter.value : 'all'
    doc.save(`ecd-reports-${fileSuffix}-${new Date().toISOString().slice(0, 10)}.pdf`)
  } catch (e) {
    window.alert(e.message || 'Could not generate the PDF. Please try again.')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div>
    <AdminTopBar title="Reports" />

    <main class="p-4 md:p-6 space-y-5 max-w-[1000px]">
      <!-- Search + Export -->
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            v-model="search"
            type="search"
            placeholder="Search..."
            class="w-full h-9 pl-10 pr-4 rounded-full bg-surface-raised border border-border text-sm focus:border-primary-400"
            @input="onSearchInput"
          />
        </div>
        <button
          class="h-9 px-4 rounded-full bg-primary-500 text-sm font-semibold text-white active:bg-primary-600 flex items-center gap-2 flex-shrink-0 transition-colors disabled:opacity-60"
          :disabled="exporting"
          @click="exportPDF"
        >
          <svg v-if="!exporting" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {{ exporting ? 'Generating...' : 'Export' }}
        </button>
      </div>

      <!-- Type filter pills -->
      <div class="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        <PillFilterButton
          v-for="tt in typeTabs"
          :key="tt.key"
          :active="typeFilter === tt.key"
          @click="typeFilter = tt.key; load()"
        >
          {{ tt.label }}
        </PillFilterButton>
      </div>

      <!-- Status tabs -->
      <div class="flex gap-2 border-b border-border overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
          :class="filter === tab.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-ink-faint hover:text-ink-soft'"
          @click="filter = tab.key; load()"
        >
          {{ tab.label }}
        </button>
      </div>

      <p v-if="!loading" class="text-sm text-ink-soft">{{ pendingCount }} reports</p>

      <div v-if="loading" class="space-y-3">
        <SkeletonBlock v-for="i in 3" :key="i" height="8rem" rounded="rounded-card" />
      </div>

      <div v-else-if="reports.length" class="space-y-3">
        <BaseCard v-for="report in reports" :key="report.id">
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-3 min-w-0">
              <button
                v-if="photoOf(report)"
                class="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-border"
                aria-label="View evidence photo"
                @click="openPhoto(photoOf(report))"
              >
                <img :src="photoOf(report)" alt="" class="w-full h-full object-cover" />
              </button>
              <span v-else class="w-10 h-10 rounded-xl bg-surface-sunken flex items-center justify-center flex-shrink-0">
                <ReportTypeIcon :type="report.reportType" />
              </span>
              <div class="min-w-0">
                <p class="font-medium text-ink">{{ typeLabels[report.reportType] }}</p>
                <p class="text-xs text-ink-faint mt-0.5">
                  {{ childNameOf(report) }} · {{ centerOf(report) }} · submitted by {{ submittedByOf(report) }}
                </p>
                <p class="text-sm text-ink-soft mt-2">{{ notesOf(report) }}</p>
                <p class="text-xs text-ink-faint mt-2">{{ formatDate(report.createdAt) }}</p>
              </div>
            </div>
          </div>

          <div v-if="filter === 'submitted' || filter === 'under_review'" class="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/60">
            <BaseButton
              variant="primary"
              size="sm"
              :loading="actingOn === report.id"
              @click="confirmAct(report, 'approved')"
            >
              Approve
            </BaseButton>
            <BaseButton
              variant="outline"
              size="sm"
              :disabled="actingOn === report.id"
              @click="act(report, 'under_review')"
            >
              Mark under review
            </BaseButton>
            <BaseButton
              variant="danger"
              size="sm"
              :disabled="actingOn === report.id"
              @click="confirmAct(report, 'rejected')"
            >
              Reject
            </BaseButton>
          </div>
        </BaseCard>
      </div>

      <EmptyState v-else title="No reports here" message="Nothing in this category right now." />
    </main>

    <!-- Photo lightbox -->
    <BaseModal v-model="showPhotoModal" title="Evidence photo" size="md">
      <img v-if="activePhoto" :src="activePhoto" alt="" class="w-full rounded-xl object-contain max-h-[70vh]" />
    </BaseModal>

    <!-- Approve / Reject confirmation -->
    <BaseModal
      v-model="showActionModal"
      :title="actionStatus === 'approved' ? 'Approve report' : 'Reject report'"
      size="sm"
    >
      <p class="text-sm text-ink-soft">
        <template v-if="actionStatus === 'approved'">
          Approve this {{ typeLabels[actionTarget?.reportType]?.toLowerCase() || 'report' }} submitted by
          <span class="font-medium text-ink">{{ submittedByOf(actionTarget || {}) }}</span>?
        </template>
        <template v-else>
          Reject this {{ typeLabels[actionTarget?.reportType]?.toLowerCase() || 'report' }} submitted by
          <span class="font-medium text-ink">{{ submittedByOf(actionTarget || {}) }}</span>? This cannot be undone.
        </template>
      </p>
      <template #footer>
        <BaseButton variant="outline" full-width @click="showActionModal = false">Cancel</BaseButton>
        <BaseButton
          :variant="actionStatus === 'approved' ? 'primary' : 'danger'"
          full-width
          @click="performConfirmedAction"
        >
          {{ actionStatus === 'approved' ? 'Approve' : 'Reject' }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
