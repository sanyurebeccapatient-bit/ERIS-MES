<script setup>
import { ref, reactive, watch, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppTopBar from '@/components/layout/AppTopBar.vue'
import StepProgress from '@/components/forms/StepProgress.vue'
import FormField from '@/components/forms/FormField.vue'
import PhotoCapture from '@/components/forms/PhotoCapture.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import ReportTypeIcon from '@/components/ui/ReportTypeIcon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useGeolocation } from '@/composables/useGeolocation'
import { useAuthStore } from '@/stores/auth'
import { useSyncStore } from '@/stores/sync'
import { useDashboardStore } from '@/stores/dashboard'
import { useI18n, refreshKey } from '@/i18n/index.js'
import { listChildren } from '@/services/api/children.service'
import { resolveMediaUrl } from '@/utils/mediaUrl.js'
import { db } from '@/services/offline/db'
import { submitOrQueue } from '@/services/offline/syncEngine'

const router = useRouter()
const route = useRoute()
const syncStore = useSyncStore()
const authStore = useAuthStore()
const dashboardStore = useDashboardStore()
const { t } = useI18n()

const stepsLabels = computed(() => [t('newReport.step1'), t('newReport.step2'), t('newReport.step3'), t('newReport.step4')])
const current = ref(0)

const reportTypes = computed(() => [
  { key: 'attendance', label: t('newReport.types.attendance'), description: t('newReport.types.attendanceDesc') },
  { key: 'health', label: t('newReport.types.health'), description: t('newReport.types.healthDesc') },
  { key: 'visit', label: t('newReport.types.visit'), description: t('newReport.types.visitDesc') },
  { key: 'general', label: t('newReport.types.general'), description: t('newReport.types.generalDesc') },
])

const form = reactive({
  reportType: '',
  childId: '',
  childName: '',
  notes: '',
  photo: null,
  healthSeverity: '',
  visitType: 'Home Visit',
  visitAddress: '',
  attendanceRecords: {},
})

const { coords, status: gpsStatus, errorMessage: gpsError, capture: captureGps } = useGeolocation()

// ---- Children list for attendance & child selection ----
const childrenLoading = ref(false)
const childrenList = ref([])

async function loadChildren() {
  childrenLoading.value = true
  try {
    childrenList.value = await listChildren()
  } catch { childrenList.value = [] }
  finally { childrenLoading.value = false }
}

// Auto-load children when report type is selected + auto-advance to step 2
watch(() => form.reportType, (type) => {
  if (type) {
    if (childrenList.value.length === 0) {
      loadChildren()
    }
    // Auto-advance to step 2 (Details) after selecting report type
    current.value = 1
  }
})

const reportTypeLabel = computed(() => {
  const tt = reportTypes.value.find(r => r.key === form.reportType)
  return tt ? tt.label : form.reportType
})

// ---- Attendance helpers ----
function setAttendance(childId, status) {
  form.attendanceRecords[childId] = status
}

function getAttendanceStatus(childId) {
  return form.attendanceRecords[childId] || null
}

const attendanceSummary = computed(() => {
  const records = Object.entries(form.attendanceRecords)
  const total = childrenList.value.length
  const present = records.filter(([, s]) => s === 'present').length
  const absent = records.filter(([, s]) => s === 'absent').length
  const marked = records.length
  return { total, present, absent, marked, unmarked: total - marked }
})

// ---- Autosave draft locally ----
let draftId = null
const saveState = ref('idle')

async function saveDraft() {
  try {
    saveState.value = 'saving'
    const payload = { formType: 'report', data: { ...form, coords: coords.value }, updatedAt: new Date().toISOString() }
    if (draftId) {
      await db.drafts.update(draftId, payload)
    } else {
      draftId = await db.drafts.add(payload)
    }
    saveState.value = 'saved'
  } catch {
    // Draft save failed silently — non-critical
  }
}

let saveTimeout = null
watch(form, () => {
  clearTimeout(saveTimeout)
  saveTimeout = setTimeout(saveDraft, 800)
}, { deep: true })

onMounted(() => {
  captureGps()
  // Allow deep-linking straight into a report type, e.g. from the
  // Attendance page's "Scan QR" CTA (?type=attendance).
  const presetType = route.query.type
  if (presetType && reportTypes.value.some((r) => r.key === presetType)) {
    form.reportType = presetType
  }
})

function next() {
  if (current.value < stepsLabels.value.length - 1) current.value++
}
function back() {
  if (current.value > 0) current.value--
  else router.back()
}

const submitting = ref(false)

async function submit() {
  submitting.value = true
  try {
    let anyQueued = false

    if (form.reportType === 'attendance') {
      const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      for (const [childId, status] of Object.entries(form.attendanceRecords)) {
        const { queued } = await submitOrQueue('attendance', 'post', '/attendance', {
          childId, status, time: status === 'present' ? time : null, date: new Date().toISOString().slice(0, 10),
        })
        if (queued) anyQueued = true
      }
      const summary = attendanceSummary.value
      // Store a language-neutral marker with the raw counts instead of the
      // translated words themselves — baking translated text in here means
      // it stays frozen in whatever language was active when the report was
      // submitted, so switching the app language later can't re-translate
      // it. The reports views detect this marker and rebuild the display
      // text live using the current locale.
      const summaryMarker = `__ATTENDANCE_SUMMARY__:present=${summary.present};absent=${summary.absent};unmarked=${summary.unmarked};total=${summary.total}`
      const { queued } = await submitOrQueue('report', 'post', '/reports', {
        reportType: 'attendance',
        childName: summaryMarker,
        notes: form.notes || summaryMarker,
        photo: form.photo,
        submittedAt: new Date().toISOString(),
      })
      if (queued) anyQueued = true
    } else {
      const { queued } = await submitOrQueue('report', 'post', '/reports', {
        reportType: form.reportType,
        childId: form.childId || undefined,
        childName: form.childName,
        notes: form.notes,
        photo: form.photo,
        submittedAt: new Date().toISOString(),
      })
      if (queued) anyQueued = true
    }
    if (draftId) await db.drafts.delete(draftId)
    syncStore.refreshPendingCount()
    if (form.reportType === 'attendance') {
      if (anyQueued) {
        // Some/all writes couldn't go through directly (offline) — fall
        // back to the queue-flush path so they sync as soon as possible.
        await syncStore.manualSync()
      }
      // Refresh dashboard stats immediately either way: direct writes are
      // already reflected server-side, and manualSync() above catches the
      // queued case, so there's no need to wait for the next background
      // sync interval.
      dashboardStore.refreshAttendanceStats()
    }
    router.replace({ name: 'caregiver-dashboard' })
  } catch {
    // Submit failed — data is in sync queue, will retry
  } finally {
    submitting.value = false
  }
}

function canProceed() {
  if (current.value === 0) return !!form.reportType
  if (current.value === 1) {
    if (form.reportType === 'attendance') return attendanceSummary.value.marked > 0
    return form.childName.trim().length > 0
  }
  return true
}

function selectChild(child) {
  form.childId = child.id
  form.childName = child.name
}

function childInitials(name) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('')
}

// Health severity options
const severityOptions = computed(() => [
  { value: 'low', label: t('children.low') },
  { value: 'medium', label: t('children.medium') },
  { value: 'high', label: t('children.high') },
  { value: 'critical', label: t('children.critical') },
])

const visitTypeOptions = computed(() => [
  { value: 'Home Visit', label: t('visits.visitTypes.home') },
  { value: 'Health Follow-up', label: t('visits.visitTypes.health') },
  { value: 'Social Welfare Check', label: t('visits.visitTypes.social') },
  { value: 'Other', label: t('visits.visitTypes.other') },
])

// Expose refreshKey for language change reactivity
const localeKey = refreshKey
</script>

<template>
  <div :key="'report-' + localeKey">
    <AppTopBar :title="t('newReport.title')" show-back @click="back" />

    <main class="px-4 pt-4 pb-32 space-y-5">
      <div>
        <StepProgress :steps="stepsLabels" :current="current" />
      </div>

      <!-- Step 1: Report type -->
      <div v-if="current === 0" class="space-y-2.5">
        <p class="text-sm text-ink-soft">{{ t('newReport.whatReport') }}</p>
        <button
          v-for="type in reportTypes"
          :key="type.key"
          class="w-full flex items-center gap-3 p-4 rounded-card border-2 transition-colors text-left"
          :class="form.reportType === type.key ? 'border-primary-500 bg-primary-50' : 'border-border bg-surface-raised'"
          @click="form.reportType = type.key"
        >
          <span
            class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            :class="form.reportType === type.key ? 'bg-white' : 'bg-surface-sunken'"
          >
            <ReportTypeIcon :type="type.key" />
          </span>
          <div class="min-w-0">
            <span class="font-medium text-ink block">{{ type.label }}</span>
            <span class="text-xs text-ink-soft">{{ type.description }}</span>
          </div>
        </button>
      </div>

      <!-- Step 2: Details -->
      <div v-else-if="current === 1" class="space-y-4">
        <!-- ATTENDANCE: Children list with present/absent buttons -->
        <template v-if="form.reportType === 'attendance'">
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-ink">{{ t('attendance.markAttendance') }}</p>
            <p class="text-xs text-ink-faint">
              {{ attendanceSummary.marked }}/{{ attendanceSummary.total }} {{ t('common.marked') }}
            </p>
          </div>

          <!-- Summary strip -->
          <div class="grid grid-cols-3 gap-2">
            <div class="text-center py-2 rounded-xl bg-success-500/10">
              <p class="text-lg font-display font-bold text-success-600">{{ attendanceSummary.present }}</p>
              <p class="text-xs text-success-600/70">{{ t('common.present') }}</p>
            </div>
            <div class="text-center py-2 rounded-xl bg-danger-500/10">
              <p class="text-lg font-display font-bold text-danger-600">{{ attendanceSummary.absent }}</p>
              <p class="text-xs text-danger-600/70">{{ t('common.absent') }}</p>
            </div>
            <div class="text-center py-2 rounded-xl bg-surface-sunken">
              <p class="text-lg font-display font-bold text-ink-soft">{{ attendanceSummary.unmarked }}</p>
              <p class="text-xs text-ink-faint">{{ t('common.unmarked') }}</p>
            </div>
          </div>

          <!-- Children list -->
          <div v-if="childrenLoading" class="space-y-2">
            <div v-for="i in 4" :key="i" class="h-16 rounded-xl bg-surface-sunken animate-pulse" />
          </div>
          <div v-else-if="childrenList.length" class="space-y-2">
            <BaseCard
              v-for="child in childrenList"
              :key="child.id"
              :padded="false"
              class="flex items-center gap-3 px-3.5 py-3"
            >
              <img
                v-if="child.photoUrl"
                :src="resolveMediaUrl(child.photoUrl)"
                :alt="child.name"
                class="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
              <div v-else class="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600 font-display font-semibold text-sm flex-shrink-0">
                {{ childInitials(child.name) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-medium text-ink text-sm truncate">{{ child.name }}</p>
                <p class="text-xs text-ink-faint">{{ child.age ?? '—' }} {{ t('children.yrs') }}</p>
              </div>
              <!-- Present button (green check) -->
              <button
                class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all border-2"
                :class="getAttendanceStatus(child.id) === 'present' ? 'border-success-500 bg-success-500 text-white' : 'border-border bg-surface text-ink-faint'"
                :aria-label="t('common.present')"
                @click="setAttendance(child.id, 'present')"
              >
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <!-- Absent button (red cross) -->
              <button
                class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all border-2"
                :class="getAttendanceStatus(child.id) === 'absent' ? 'border-danger-500 bg-danger-500 text-white' : 'border-border bg-surface text-ink-faint'"
                :aria-label="t('common.absent')"
                @click="setAttendance(child.id, 'absent')"
              >
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </BaseCard>
          </div>
          <EmptyState
            v-else
            :title="t('children.noChildrenRegistered')"
            :message="t('children.noChildrenRegisteredDesc')"
          />

          <!-- Optional notes -->
          <FormField :label="t('attendance.additionalNotes')" :hint="t('attendance.attendanceNotes')">
            <textarea
              v-model="form.notes"
              rows="3"
              :placeholder="t('attendance.attendanceNotesPlaceholder')"
              class="w-full p-4 rounded-xl bg-surface-raised border border-border text-base focus:border-primary-400 resize-none"
            />
          </FormField>
        </template>

        <!-- HEALTH, VISIT, GENERAL: Child selection + notes -->
        <template v-else>
          <FormField :label="t('common.child')" required>
            <div v-if="childrenLoading" class="space-y-2">
              <div v-for="i in 3" :key="i" class="h-12 rounded-xl bg-surface-sunken animate-pulse" />
            </div>
            <div v-else-if="childrenList.length" class="space-y-2 max-h-60 overflow-y-auto">
              <button
                v-for="child in childrenList"
                :key="child.id"
                class="w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left"
                :class="form.childId === child.id ? 'border-primary-500 bg-primary-50' : 'border-border bg-surface-raised'"
                @click="selectChild(child)"
              >
                <img
                  v-if="child.photoUrl"
                  :src="resolveMediaUrl(child.photoUrl)"
                  :alt="child.name"
                  class="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
                <div v-else class="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600 font-display font-semibold text-sm flex-shrink-0">
                  {{ childInitials(child.name) }}
                </div>
                <div class="min-w-0">
                  <p class="font-medium text-ink text-sm truncate">{{ child.name }}</p>
                  <p class="text-xs text-ink-faint">{{ child.age ?? '—' }} {{ t('children.yrs') }} · {{ child.guardian?.name || child.guardian || '—' }}</p>
                </div>
              </button>
            </div>
            <EmptyState
              v-else
              :title="t('children.noChildrenRegistered')"
              :message="t('newReport.selectChildForReport')"
            />
          </FormField>

          <!-- Health-specific fields -->
          <template v-if="form.reportType === 'health'">
            <FormField :label="t('newReport.severity')" :hint="t('newReport.severityHint')">
              <BaseSelect v-model="form.healthSeverity" :options="severityOptions" />
            </FormField>
          </template>

          <!-- Visit-specific fields -->
          <template v-if="form.reportType === 'visit'">
            <FormField :label="t('newReport.visitType')" :hint="t('newReport.visitTypeHint')">
              <BaseSelect v-model="form.visitType" :options="visitTypeOptions" />
            </FormField>
            <FormField :label="t('common.address')" :hint="t('visits.address')">
              <input
                v-model="form.visitAddress"
                type="text"
                :placeholder="t('visits.addressPlaceholder')"
                class="w-full h-touch-lg px-4 rounded-xl bg-surface-raised border border-border text-base focus:border-primary-400"
              />
            </FormField>
          </template>

          <FormField :label="form.reportType === 'health' ? t('newReport.describeConcern') : form.reportType === 'visit' ? t('newReport.visitNotes') : t('newReport.reportNotes')" :hint="t('newReport.provideDetail')" required>
            <textarea
              v-model="form.notes"
              rows="5"
              :placeholder="form.reportType === 'health' ? t('newReport.describePlaceholder') : form.reportType === 'visit' ? t('newReport.visitNotesPlaceholder') : t('newReport.reportNotesPlaceholder')"
              class="w-full p-4 rounded-xl bg-surface-raised border border-border text-base focus:border-primary-400 resize-none"
            />
          </FormField>
        </template>
      </div>

      <!-- Step 3: Evidence -->
      <div v-else-if="current === 2" class="space-y-4">
        <FormField :label="t('common.photo')" :hint="t('common.optional').toLowerCase()">
          <PhotoCapture @captured="(p) => (form.photo = p)" />
        </FormField>

        <FormField :label="t('newReport.location')">
          <BaseCard class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div class="min-w-0 flex-1 text-sm">
              <p v-if="gpsStatus === 'success'" class="text-ink font-medium">
                {{ coords.latitude.toFixed(5) }}, {{ coords.longitude.toFixed(5) }}
              </p>
              <p v-else-if="gpsStatus === 'locating'" class="text-ink-soft">{{ t('newReport.gettingLocation') }}</p>
              <p v-else-if="gpsStatus === 'error'" class="text-danger-600">{{ gpsError }}</p>
              <p v-else class="text-ink-soft">{{ t('newReport.locationNotCaptured') }}</p>
              <p class="text-xs text-ink-faint mt-0.5">{{ t('newReport.locationAutoDesc') }}</p>
            </div>
            <button
              v-if="gpsStatus !== 'success'"
              class="text-xs font-semibold text-primary-500 flex-shrink-0"
              @click="captureGps"
            >
              {{ t('common.retry') }}
            </button>
          </BaseCard>
        </FormField>
      </div>

      <!-- Step 4: Review -->
      <div v-else class="space-y-4">
        <BaseCard class="space-y-3">
          <div>
            <p class="text-xs text-ink-faint">{{ t('newReport.reportType') }}</p>
            <div class="flex items-center gap-2 mt-0.5">
              <ReportTypeIcon :type="form.reportType" size="sm" />
              <p class="font-medium text-ink">{{ reportTypeLabel }}</p>
            </div>
          </div>

          <!-- Attendance summary in review -->
          <template v-if="form.reportType === 'attendance'">
            <div>
              <p class="text-xs text-ink-faint">{{ t('newReport.attendanceSummary') }}</p>
              <div class="flex items-center gap-3 mt-1">
                <BaseBadge tone="success">{{ attendanceSummary.present }} {{ t('common.present').toLowerCase() }}</BaseBadge>
                <BaseBadge tone="danger">{{ attendanceSummary.absent }} {{ t('common.absent').toLowerCase() }}</BaseBadge>
                <BaseBadge v-if="attendanceSummary.unmarked > 0" tone="neutral">{{ attendanceSummary.unmarked }} {{ t('common.unmarked').toLowerCase() }}</BaseBadge>
              </div>
            </div>
            <div>
              <p class="text-xs text-ink-faint mb-1.5">{{ t('common.children') }}</p>
              <div class="space-y-1.5">
                <div v-for="child in childrenList" :key="child.id" class="flex items-center justify-between text-sm">
                  <span class="text-ink truncate">{{ child.name }}</span>
                  <BaseBadge
                    v-if="getAttendanceStatus(child.id)"
                    :tone="getAttendanceStatus(child.id) === 'present' ? 'success' : 'danger'"
                  >
                    {{ getAttendanceStatus(child.id) === 'present' ? t('common.present') : t('common.absent') }}
                  </BaseBadge>
                  <span v-else class="text-ink-faint text-xs">{{ t('common.unmarked') }}</span>
                </div>
              </div>
            </div>
          </template>

          <!-- Non-attendance child info -->
          <div v-else-if="form.childName">
            <p class="text-xs text-ink-faint">{{ t('common.child') }}</p>
            <p class="font-medium text-ink">{{ form.childName }}</p>
          </div>

          <!-- Health severity -->
          <div v-if="form.reportType === 'health' && form.healthSeverity">
            <p class="text-xs text-ink-faint">{{ t('newReport.severityLabel') }}</p>
            <BaseBadge :tone="form.healthSeverity === 'high' || form.healthSeverity === 'critical' ? 'danger' : form.healthSeverity === 'medium' ? 'warning' : 'info'">
              {{ severityOptions.find(o => o.value === form.healthSeverity)?.label || form.healthSeverity }}
            </BaseBadge>
          </div>

          <!-- Visit type -->
          <div v-if="form.reportType === 'visit' && form.visitType">
            <p class="text-xs text-ink-faint">{{ t('newReport.visitTypeLabel') }}</p>
            <p class="font-medium text-ink">{{ visitTypeOptions.find(o => o.value === form.visitType)?.label || form.visitType }}</p>
          </div>
          <div v-if="form.reportType === 'visit' && form.visitAddress">
            <p class="text-xs text-ink-faint">{{ t('newReport.addressLabel') }}</p>
            <p class="font-medium text-ink text-sm">{{ form.visitAddress }}</p>
          </div>

          <div v-if="form.notes">
            <p class="text-xs text-ink-faint">{{ t('newReport.notesLabel') }}</p>
            <p class="text-sm text-ink">{{ form.notes }}</p>
          </div>
          <div v-if="form.photo">
            <p class="text-xs text-ink-faint mb-1.5">{{ t('newReport.photoLabel') }}</p>
            <img :src="form.photo" class="w-full h-32 object-cover rounded-lg" alt="Report photo" />
          </div>
          <div v-if="coords">
            <p class="text-xs text-ink-faint">{{ t('newReport.location') }}</p>
            <p class="text-sm text-ink">{{ coords.latitude.toFixed(5) }}, {{ coords.longitude.toFixed(5) }}</p>
          </div>
        </BaseCard>
        <p class="text-xs text-ink-faint text-center">
          {{ saveState === 'saved' ? t('newReport.draftSaved') : t('newReport.savingDraft') }}
        </p>
      </div>
    </main>

    <!-- Sticky bottom actions -->
    <div class="fixed bottom-0 left-0 right-0 bg-surface-raised border-t border-border px-4 py-3 safe-area-bottom flex gap-3 z-40">
      <BaseButton variant="outline" @click="back">{{ t('common.back') }}</BaseButton>
      <BaseButton
        v-if="current < stepsLabels.length - 1"
        variant="primary"
        full-width
        :disabled="!canProceed()"
        @click="next"
      >
        {{ t('common.next') }}
      </BaseButton>
      <BaseButton v-else variant="accent" full-width :loading="submitting" @click="submit">
        {{ t('newReport.submitReport') }}
      </BaseButton>
    </div>
  </div>
</template>
