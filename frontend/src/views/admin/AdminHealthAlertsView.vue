<script setup>
import { onMounted, ref, computed } from 'vue'
import * as adminService from '@/services/api/admin.service'
import { listChildren } from '@/services/api/children.service'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PillFilterButton from '@/components/ui/PillFilterButton.vue'
import IconAddButton from '@/components/ui/IconAddButton.vue'

const loading = ref(true)
const hasLoaded = ref(false)
const alerts = ref([])
const severityFilter = ref('')
const resolving = ref(null)

// ---- Resolve confirmation modal ----
const showResolveModal = ref(false)
const resolveTarget = ref(null)
const resolveError = ref('')

function openResolveModal(alert) {
  resolveTarget.value = alert
  resolveError.value = ''
  showResolveModal.value = true
}

// ---- Create alert modal ----
const showCreateModal = ref(false)
const creating = ref(false)
const createError = ref('')
const childrenList = ref([])
const newAlert = ref({ childId: '', severity: 'medium', title: '', detail: '' })

const severityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const childOptions = computed(() =>
  childrenList.value.map(c => ({ value: c.id, label: c.name }))
)

function openCreateModal() {
  newAlert.value = { childId: childrenList.value[0]?.id || '', severity: 'medium', title: '', detail: '' }
  createError.value = ''
  showCreateModal.value = true
}

async function submitCreateAlert() {
  if (!newAlert.value.childId) {
    createError.value = 'Please select a child.'
    return
  }
  if (!newAlert.value.title.trim()) {
    createError.value = 'Title is required.'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    await adminService.createHealthAlert({
      child: newAlert.value.childId,
      severity: newAlert.value.severity,
      title: newAlert.value.title.trim(),
      detail: newAlert.value.detail.trim(),
    })
    showCreateModal.value = false
    await load()
  } catch (e) {
    createError.value = e.message || 'Could not create alert. Please try again.'
  } finally {
    creating.value = false
  }
}

async function load() {
  // Only show the full skeleton/blank state on the very first load — a
  // subsequent refresh (e.g. after resolving an alert or switching the
  // severity filter) updates the list in place instead of flashing back
  // to a loading state, which previously made the whole page blank out.
  if (!hasLoaded.value) loading.value = true
  try {
    alerts.value = await adminService.listHealthAlerts({ severity: severityFilter.value || undefined })
  } finally {
    loading.value = false
    hasLoaded.value = true
  }
}

onMounted(async () => {
  await load()
  try { childrenList.value = await listChildren() } catch { /* non-critical */ }
})

const severityTone = { low: 'neutral', medium: 'warning', high: 'danger', critical: 'danger' }

function centerNameOf(child) {
  if (child?.center?.name) return child.center.name
  if (child?.center && !/^[a-f0-9]{24}$/i.test(child.center)) return child.center
  return ''
}

const counts = computed(() => ({
  high: alerts.value.filter((a) => a.severity === 'high' || a.severity === 'critical').length,
  medium: alerts.value.filter((a) => a.severity === 'medium').length,
  low: alerts.value.filter((a) => a.severity === 'low').length,
}))

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

async function resolve(alert) {
  resolving.value = alert.id
  resolveError.value = ''
  try {
    await adminService.updateHealthAlert(alert.id, { status: 'resolved' })
    alerts.value = alerts.value.filter((a) => a.id !== alert.id)
    showResolveModal.value = false
  } catch (e) {
    resolveError.value = e.message || 'Could not resolve alert. Please try again.'
  } finally {
    resolving.value = null
  }
}
</script>

<template>
  <div>

    <main class="p-4 md:p-6 space-y-5 max-w-[1000px]">
      <!-- Summary strip -->
      <div v-if="!loading" class="grid grid-cols-3 gap-3">
        <BaseCard class="text-center !py-3">
          <p class="text-xl font-display font-bold text-danger-600">{{ counts.high }}</p>
          <p class="text-xs text-ink-soft">High</p>
        </BaseCard>
        <BaseCard class="text-center !py-3">
          <p class="text-xl font-display font-bold text-accent-600">{{ counts.medium }}</p>
          <p class="text-xs text-ink-soft">Medium</p>
        </BaseCard>
        <BaseCard class="text-center !py-3">
          <p class="text-xl font-display font-bold text-ink-soft">{{ counts.low }}</p>
          <p class="text-xs text-ink-soft">Low</p>
        </BaseCard>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex gap-2 overflow-x-auto flex-1 -mx-4 px-4 pb-1">
          <PillFilterButton
            v-for="opt in [{v:'', l:'All'}, {v:'high', l:'High'}, {v:'medium', l:'Medium'}, {v:'low', l:'Low'}]"
            :key="opt.v"
            :active="severityFilter === opt.v"
            @click="severityFilter = opt.v; load()"
          >
            {{ opt.l }}
          </PillFilterButton>
        </div>
        <IconAddButton label="Create alert" @click="openCreateModal" />
      </div>

      <div v-if="loading" class="space-y-2.5">
        <SkeletonBlock v-for="i in 3" :key="i" height="5.5rem" rounded="rounded-card" />
      </div>

      <div v-else-if="alerts.length" class="space-y-2.5">
        <BaseCard v-for="alert in alerts" :key="alert.id">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0">
              <span
                class="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                :class="['high','critical'].includes(alert.severity) ? 'bg-danger-500' : alert.severity === 'medium' ? 'bg-accent-400' : 'bg-ink-faint'"
              />
              <div class="min-w-0">
                <p class="font-medium text-ink">{{ alert.title }}</p>
                <p class="text-xs text-ink-soft mt-0.5">{{ alert.child?.name }} · {{ centerNameOf(alert.child) }}</p>
                <p class="text-sm text-ink-soft mt-1.5">{{ alert.detail }}</p>
                <p class="text-xs text-ink-faint mt-1.5">{{ formatDate(alert.createdAt) }}</p>
              </div>
            </div>
            <div class="flex flex-col items-end gap-2 flex-shrink-0">
              <BaseBadge :tone="severityTone[alert.severity]">{{ alert.severity }}</BaseBadge>
              <button
                class="text-xs font-medium text-primary-600 disabled:opacity-50"
                :disabled="resolving === alert.id"
                @click="openResolveModal(alert)"
              >
                Mark resolved
              </button>
            </div>
          </div>
        </BaseCard>
      </div>

      <EmptyState v-else title="No active alerts" message="All health alerts are resolved." />
    </main>

    <!-- Create alert modal -->
    <BaseModal v-model="showCreateModal" title="Create health alert">
      <div class="space-y-4">
        <div v-if="childOptions.length">
          <label class="block text-sm font-medium text-ink mb-1.5">Child <span class="text-danger-600">*</span></label>
          <BaseSelect v-model="newAlert.childId" :options="childOptions" placeholder="Select a child" size="sm" />
        </div>
        <p v-else class="text-sm text-danger-600">No children found. Add a child before creating a health alert.</p>
        <div>
          <label class="block text-sm font-medium text-ink mb-1.5">Severity</label>
          <BaseSelect v-model="newAlert.severity" :options="severityOptions" size="sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink mb-1.5">Title</label>
          <input
            v-model="newAlert.title"
            type="text"
            placeholder="Brief description of the alert"
            class="w-full h-touch px-4 rounded-xl bg-surface border border-border text-sm focus:border-primary-400"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink mb-1.5">Detail</label>
          <textarea
            v-model="newAlert.detail"
            rows="3"
            placeholder="Additional details (optional)"
            class="w-full p-4 rounded-xl bg-surface border border-border text-sm focus:border-primary-400 resize-none"
          />
        </div>
        <p v-if="createError" class="text-sm text-danger-600">{{ createError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="outline" full-width @click="showCreateModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" full-width :loading="creating" :disabled="!childOptions.length" @click="submitCreateAlert">Create alert</BaseButton>
      </template>
    </BaseModal>

    <!-- Resolve confirmation modal -->
    <BaseModal v-model="showResolveModal" title="Mark resolved" size="sm">
      <p class="text-sm text-ink-soft">
        Mark "{{ resolveTarget?.title }}" as resolved? This alert will be removed from the active list.
      </p>
      <p v-if="resolveError" class="text-sm text-danger-600 mt-2">{{ resolveError }}</p>
      <template #footer>
        <BaseButton variant="outline" full-width @click="showResolveModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" full-width :loading="resolving === resolveTarget?.id" @click="resolve(resolveTarget)">Mark resolved</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
