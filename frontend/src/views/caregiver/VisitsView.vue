<script setup>
import { onMounted, ref, computed, nextTick } from 'vue'
import { listVisits, createVisit as apiCreateVisit, updateVisit as apiUpdateVisit } from '@/services/api/records.service'
import { listChildren } from '@/services/api/children.service'
import { useI18n, refreshKey } from '@/i18n/index.js'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import DateTimeField from '@/components/ui/DateTimeField.vue'
import FormField from '@/components/forms/FormField.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { resolveMediaUrl } from '@/utils/mediaUrl.js'

const { t } = useI18n()
const loading = ref(true)
const hasLoaded = ref(false)
const visits = ref([])
const children = ref([])
const filter = ref('all')
const errorMessage = ref('')

async function load() {
  if (!hasLoaded.value) loading.value = true
  errorMessage.value = ''
  try {
    const [visitsRes, childrenRes] = await Promise.all([listVisits(), listChildren()])
    const freshVisits = Array.isArray(visitsRes) ? visitsRes : []
    const freshChildren = Array.isArray(childrenRes) ? childrenRes : []
    if (hasLoaded.value) {
      // Merge new visits into existing list
      const existingIds = new Set(visits.value.map(v => v.id))
      for (const v of freshVisits) {
        const idx = visits.value.findIndex(x => x.id === v.id)
        if (idx !== -1) visits.value[idx] = v
        else visits.value.unshift(v)
      }
      const existingChildIds = new Set(children.value.map(c => c.id))
      for (const c of freshChildren) {
        const idx = children.value.findIndex(x => x.id === c.id)
        if (idx !== -1) children.value[idx] = c
        else if (!existingChildIds.has(c.id)) children.value.push(c)
      }
    } else {
      visits.value = freshVisits
      children.value = freshChildren
    }
  } catch (e) {
    errorMessage.value = e.message || t('common.error')
  } finally {
    loading.value = false
    hasLoaded.value = true
  }
}

onMounted(load)

const tabs = computed(() => [
  { key: 'all', label: t('visits.all') },
  { key: 'scheduled', label: t('visits.upcoming') },
  { key: 'completed', label: t('visits.completed') },
])

const filtered = computed(() =>
  filter.value === 'all' ? visits.value : visits.value.filter((v) => v.status === filter.value)
)

const statusTone = { scheduled: 'warning', completed: 'success', missed: 'danger', cancelled: 'neutral', in_progress: 'warning' }

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// ---------------------------------------------------------------------
// Plan a visit modal
// ---------------------------------------------------------------------
const showPlanModal = ref(false)
const saving = ref(false)
const formError = ref('')

const visitTypeValues = ['Home Visit', 'Health Follow-up', 'Attendance Follow-up', 'Nutrition Check']
const visitTypeKeyMap = { 'Home Visit': 'home', 'Health Follow-up': 'health', 'Attendance Follow-up': 'attendance', 'Nutrition Check': 'nutrition' }

const visitTypes = computed(() =>
  visitTypeValues.map((val) => ({ value: val, label: t('visits.visitTypes.' + visitTypeKeyMap[val]) }))
)

const childOptions = computed(() =>
  children.value.map((c) => ({ value: c.id, label: c.name, photo: c.photoUrl ? resolveMediaUrl(c.photoUrl) : null }))
)

const emptyForm = () => ({
  childId: '',
  type: visitTypeValues[0],
  date: '',
  time: '',
  address: '',
  notes: '',
})
const form = ref(emptyForm())

function openPlanModal() {
  form.value = emptyForm()
  formError.value = ''
  const now = new Date()
  now.setMinutes(0, 0, 0)
  now.setHours(now.getHours() + 1)
  form.value.date = now.toISOString().slice(0, 10)
  form.value.time = now.toTimeString().slice(0, 5)
  showPlanModal.value = true
}

async function submitPlan() {
  if (!form.value.childId) {
    formError.value = t('visits.childRequired')
    return
  }
  if (!form.value.date || !form.value.time) {
    formError.value = t('visits.dateTimeRequired')
    return
  }

  saving.value = true
  formError.value = ''
  try {
    const scheduledFor = new Date(`${form.value.date}T${form.value.time}`).toISOString()
    const created = await apiCreateVisit({
      childId: form.value.childId,
      type: form.value.type,
      scheduledFor,
      address: form.value.address.trim(),
      notes: form.value.notes.trim(),
    })
    visits.value = [created, ...visits.value]
    showPlanModal.value = false
  } catch (e) {
    formError.value = e.message || t('common.error')
  } finally {
    saving.value = false
  }
}

// ---------------------------------------------------------------------
// Visit detail / mark complete
// ---------------------------------------------------------------------
const showDetailModal = ref(false)
const activeVisit = ref(null)
const updating = ref(false)
const detailError = ref('')

function openDetail(visit) {
  activeVisit.value = visit
  detailError.value = ''
  showDetailModal.value = true
}

async function markStatus(status) {
  updating.value = true
  detailError.value = ''
  try {
    const updated = await apiUpdateVisit(activeVisit.value.id, { status })
    const idx = visits.value.findIndex((v) => v.id === activeVisit.value.id)
    if (idx !== -1) visits.value[idx] = { ...visits.value[idx], ...updated, status }
    showDetailModal.value = false
  } catch (e) {
    detailError.value = e.message || t('common.error')
  } finally {
    updating.value = false
  }
}

// Expose refreshKey to template for reactivity on language change
const localeKey = refreshKey

// Highlight a visit when navigated from dashboard
const highlightVisitId = ref(null)
const visitCardRefs = ref({})

function setVisitRef(el, visitId) {
  if (el) visitCardRefs.value[visitId] = el
}

onMounted(() => {
  const hid = sessionStorage.getItem('highlight_visit_id')
  if (hid) {
    sessionStorage.removeItem('highlight_visit_id')
    highlightVisitId.value = hid
    nextTick(() => {
      setTimeout(() => {
        const el = visitCardRefs.value[hid]
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => { highlightVisitId.value = null }, 3000)
      }, 500)
    })
  }
})
</script>

<template>
  <div :key="'visits-' + localeKey">

    <main class="px-4 pt-4 pb-8 space-y-4">
      <!-- Filter tabs + plan button -->
      <div class="flex items-center gap-2">
        <div class="flex gap-2 overflow-x-auto flex-1 -mx-4 px-4 pb-1">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors"
            :class="filter === tab.key ? 'bg-primary-500 text-white' : 'bg-surface-raised border border-border text-ink-soft'"
            @click="filter = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
        <button
          class="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center flex-shrink-0 active:bg-primary-600"
          :aria-label="t('visits.planVisit')"
          @click="openPlanModal"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.25">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <p v-if="errorMessage" class="text-sm text-danger-600">{{ errorMessage }}</p>

      <div v-if="loading" class="space-y-2.5">
        <SkeletonBlock v-for="i in 4" :key="i" height="5rem" rounded="rounded-card" />
      </div>

      <div v-else-if="filtered.length" class="space-y-2.5">
        <BaseCard
          v-for="visit in filtered"
          :key="visit.id"
          interactive
          :ref="(el) => setVisitRef(el, visit.id)"
          class="transition-all duration-500"
          :class="highlightVisitId === visit.id ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-surface' : ''"
          @click="openDetail(visit)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0">
              <img
                v-if="visit.child?.photoUrl"
                :src="resolveMediaUrl(visit.child.photoUrl)"
                :alt="visit.child?.name"
                class="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
              <div
                v-else
                class="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600 font-display font-semibold text-xs flex-shrink-0"
              >
                {{ (visit.child?.name || '').split(' ').map((n) => n[0]).slice(0, 2).join('') }}
              </div>
              <div class="min-w-0">
              <p class="font-medium text-ink">{{ visit.child?.name }}</p>
              <p class="text-xs text-ink-soft mt-0.5">{{ t('visits.visitTypes.' + (visitTypeKeyMap[visit.type] || 'home')) }}</p>
              <p v-if="visit.address" class="text-xs text-ink-faint mt-1.5 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {{ visit.address }}
              </p>
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <BaseBadge :tone="statusTone[visit.status]">{{ t('visits.' + visit.status.replace('_', '')) || visit.status.replace('_', ' ') }}</BaseBadge>
              <p class="text-xs text-ink-soft mt-1.5">{{ formatDate(visit.scheduledFor) }}</p>
              <p class="text-xs text-ink-faint">{{ formatTime(visit.scheduledFor) }}</p>
            </div>
          </div>
        </BaseCard>
      </div>

      <EmptyState v-else :title="t('visits.noVisits')" :message="t('visits.noVisitsDesc')">
        <template #action>
          <BaseButton variant="primary" size="sm" @click="openPlanModal">{{ t('visits.planVisit') }}</BaseButton>
        </template>
      </EmptyState>
    </main>

    <!-- Plan a visit modal -->
    <BaseModal v-model="showPlanModal" :title="t('visits.planVisit')">
      <form class="space-y-4" @submit.prevent="submitPlan">
        <FormField :label="t('common.child')" required>
          <BaseSelect
            v-model="form.childId"
            :options="childOptions"
            :placeholder="t('visits.selectChild')"
            show-avatar
          />
        </FormField>
        <FormField :label="t('visits.visitType')">
          <BaseSelect v-model="form.type" :options="visitTypes" />
        </FormField>
        <div class="grid grid-cols-2 gap-3">
          <FormField :label="t('common.date')" required>
            <DateTimeField v-model="form.date" type="date" />
          </FormField>
          <FormField :label="t('common.time')" required>
            <DateTimeField v-model="form.time" type="time" />
          </FormField>
        </div>
        <FormField :label="t('common.address')" :hint="t('visits.address')">
          <input
            v-model="form.address"
            type="text"
            :placeholder="t('visits.addressPlaceholder')"
            class="w-full h-touch-lg px-4 rounded-xl bg-surface border border-border text-base focus:border-primary-400"
          />
        </FormField>
        <FormField :label="t('common.notes')">
          <textarea
            v-model="form.notes"
            rows="3"
            :placeholder="t('visits.notesPlaceholder')"
            class="w-full p-4 rounded-xl bg-surface border border-border text-base focus:border-primary-400 resize-none"
          />
        </FormField>
        <p v-if="formError" class="text-sm text-danger-600">{{ formError }}</p>
      </form>
      <template #footer>
        <BaseButton variant="outline" full-width @click="showPlanModal = false">{{ t('common.cancel') }}</BaseButton>
        <BaseButton variant="primary" full-width :loading="saving" @click="submitPlan">{{ t('visits.scheduleVisit') }}</BaseButton>
      </template>
    </BaseModal>

    <!-- Visit detail modal -->
    <BaseModal v-model="showDetailModal" :title="activeVisit?.child?.name || t('visits.title')" size="sm">
      <div v-if="activeVisit" class="space-y-3 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-ink-faint">{{ t('common.type') }}</span>
          <span class="text-ink font-medium">{{ t('visits.visitTypes.' + (visitTypeKeyMap[activeVisit.type] || 'home')) }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-ink-faint">{{ t('visits.when') }}</span>
          <span class="text-ink font-medium">{{ formatDate(activeVisit.scheduledFor) }} · {{ formatTime(activeVisit.scheduledFor) }}</span>
        </div>
        <div v-if="activeVisit.address" class="flex items-center justify-between gap-3">
          <span class="text-ink-faint flex-shrink-0">{{ t('common.address') }}</span>
          <span class="text-ink font-medium text-right">{{ activeVisit.address }}</span>
        </div>
        <div v-if="activeVisit.notes">
          <span class="text-ink-faint">{{ t('common.notes') }}</span>
          <p class="text-ink mt-1">{{ activeVisit.notes }}</p>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-ink-faint">{{ t('common.status') }}</span>
          <BaseBadge :tone="statusTone[activeVisit.status]">{{ t('visits.' + activeVisit.status.replace('_', '')) || activeVisit.status.replace('_', ' ') }}</BaseBadge>
        </div>
        <p v-if="detailError" class="text-sm text-danger-600">{{ detailError }}</p>
      </div>
      <template #footer>
        <template v-if="activeVisit?.status === 'scheduled'">
          <BaseButton variant="outline" full-width :disabled="updating" @click="markStatus('cancelled')">{{ t('visits.cancelVisit') }}</BaseButton>
          <BaseButton variant="primary" full-width :loading="updating" @click="markStatus('completed')">{{ t('visits.markCompleted') }}</BaseButton>
        </template>
        <BaseButton v-else variant="outline" full-width @click="showDetailModal = false">{{ t('common.close') }}</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
