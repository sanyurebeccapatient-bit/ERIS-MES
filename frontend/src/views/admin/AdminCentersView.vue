<script setup>
import { onMounted, ref, computed } from 'vue'
import * as adminService from '@/services/api/admin.service'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import FormField from '@/components/forms/FormField.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import IconAddButton from '@/components/ui/IconAddButton.vue'
import { resolveMediaUrl } from '@/utils/mediaUrl.js'

const loading = ref(true)
const hasLoaded = ref(false)
const centers = ref([])
const caregivers = ref([])

async function load() {
  if (!hasLoaded.value) loading.value = true
  try {
    const [centersRes, usersRes] = await Promise.all([
      adminService.listCenters(),
      adminService.listUsers(),
    ])
    centers.value = centersRes
    caregivers.value = usersRes.users || []
  } finally {
    loading.value = false
    hasLoaded.value = true
  }
}

onMounted(load)

function occupancyPct(center) {
  const enrolled = Number(center.enrolled) || 0
  const capacity = Number(center.capacity) || 0
  if (!capacity) return 0
  const pct = Math.round((enrolled / capacity) * 100)
  return Math.min(100, Math.max(0, pct))
}

function occupancyTone(pct) {
  if (pct >= 90) return 'bg-danger-500'
  if (pct >= 70) return 'bg-accent-400'
  return 'bg-success-500'
}

function managerNameOf(center) {
  return center.manager?.name || center.manager || null
}

function initials(name) {
  return (name || '').split(' ').map((n) => n[0]).slice(0, 2).join('')
}

// ---------- Children list modal ----------
const showChildrenModal = ref(false)
const childrenModalCenter = ref(null)
const centerChildren = ref([])
const loadingChildren = ref(false)

async function openChildrenModal(center) {
  childrenModalCenter.value = center
  showChildrenModal.value = true
  loadingChildren.value = true
  try {
    centerChildren.value = await adminService.listCenterChildren(center.id)
  } catch {
    centerChildren.value = []
  } finally {
    loadingChildren.value = false
  }
}

// ---------- Edit center modal ----------
const showEditModal = ref(false)
const editingCenter = ref(null)
const savingEdit = ref(false)
const editError = ref('')
const editForm = ref({ name: '', code: '', district: '', sector: '', address: '', capacity: '' })

function openEditModal(center) {
  editingCenter.value = center
  editForm.value = {
    name: center.name || '',
    code: center.code || '',
    district: center.district || '',
    sector: center.sector || '',
    address: center.address || '',
    capacity: center.capacity != null ? String(center.capacity) : '',
  }
  editError.value = ''
  showEditModal.value = true
}

async function submitEditCenter() {
  editError.value = ''
  const { name, district, sector } = editForm.value
  if (!name.trim() || !district.trim() || !sector.trim()) {
    editError.value = 'Name, district, and sector are required.'
    return
  }
  savingEdit.value = true
  try {
    const payload = { name: name.trim(), district: district.trim(), sector: sector.trim() }
    if (editForm.value.code.trim()) payload.code = editForm.value.code.trim()
    if (editForm.value.address.trim()) payload.address = editForm.value.address.trim()
    if (editForm.value.capacity !== '' && !Number.isNaN(Number(editForm.value.capacity))) {
      payload.capacity = Number(editForm.value.capacity)
    }
    const updated = await adminService.updateCenter(editingCenter.value.id, payload)
    const idx = centers.value.findIndex((c) => c.id === editingCenter.value.id)
    if (idx !== -1) centers.value[idx] = { ...centers.value[idx], ...updated }
    showEditModal.value = false
  } catch (e) {
    editError.value = e.message || 'Could not update the center. Please try again.'
  } finally {
    savingEdit.value = false
  }
}

// ---------- Assign manager modal ----------
const showAssignManagerModal = ref(false)
const assignManagerTarget = ref(null)
const assignManagerSaving = ref(false)
const assignManagerError = ref('')
const selectedManagerId = ref('')

const availableManagers = computed(() => {
  return caregivers.value.filter((c) => c.isActive)
})

function openAssignManagerModal(center) {
  assignManagerTarget.value = center
  selectedManagerId.value = center.manager?.id || ''
  assignManagerError.value = ''
  showAssignManagerModal.value = true
}

async function submitAssignManager() {
  assignManagerError.value = ''
  if (!selectedManagerId.value) {
    assignManagerError.value = 'Please select a manager.'
    return
  }
  assignManagerSaving.value = true
  try {
    const updated = await adminService.updateCenter(assignManagerTarget.value.id, { manager: selectedManagerId.value })
    const idx = centers.value.findIndex((c) => c.id === assignManagerTarget.value.id)
    if (idx !== -1) centers.value[idx] = { ...centers.value[idx], ...updated }
    showAssignManagerModal.value = false
  } catch (e) {
    assignManagerError.value = e.message || 'Could not assign manager. Please try again.'
  } finally {
    assignManagerSaving.value = false
  }
}

// ---------- Add center modal ----------
const showAddModal = ref(false)
const creating = ref(false)
const createError = ref('')
const newCenter = ref({ name: '', code: '', district: '', sector: '', address: '', capacity: '' })

function openAddModal() {
  newCenter.value = { name: '', code: '', district: '', sector: '', address: '', capacity: '' }
  createError.value = ''
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
}

async function submitNewCenter() {
  createError.value = ''
  const { name, district, sector } = newCenter.value
  if (!name.trim() || !district.trim() || !sector.trim()) {
    createError.value = 'Name, district, and sector are required.'
    return
  }
  creating.value = true
  try {
    const payload = {
      name: name.trim(),
      district: district.trim(),
      sector: sector.trim(),
    }
    if (newCenter.value.code.trim()) payload.code = newCenter.value.code.trim()
    if (newCenter.value.address.trim()) payload.address = newCenter.value.address.trim()
    if (newCenter.value.capacity !== '' && !Number.isNaN(Number(newCenter.value.capacity))) {
      payload.capacity = Number(newCenter.value.capacity)
    }
    const created = await adminService.createCenter(payload)
    centers.value = [...centers.value, created].sort((a, b) => a.name.localeCompare(b.name))
    showAddModal.value = false
  } catch (e) {
    createError.value = e.message || 'Could not create the center. Please try again.'
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div>

    <main class="p-4 md:p-6 space-y-5 max-w-[1400px]">
      <div class="flex items-center justify-between">
        <p class="text-sm text-ink-soft">{{ centers.length }} centers</p>
        <IconAddButton label="Add center" @click="openAddModal" />
      </div>

      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonBlock v-for="i in 4" :key="i" height="10rem" rounded="rounded-card" />
      </div>

      <div v-else-if="centers.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <BaseCard v-for="center in centers" :key="center.id">
          <div class="flex items-start justify-between mb-3">
            <div class="min-w-0 flex-1 mr-2">
              <h3 class="font-display font-semibold text-ink truncate">{{ center.name }}</h3>
              <p class="text-xs text-ink-faint">{{ center.code }} · {{ center.district }}, {{ center.sector }}</p>
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <BaseBadge :tone="center.isActive ? 'success' : 'neutral'">
                {{ center.isActive ? 'Active' : 'Inactive' }}
              </BaseBadge>
              <button
                class="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-ink-faint hover:bg-surface-sunken transition-colors flex-shrink-0"
                aria-label="Edit center"
                @click="openEditModal(center)"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          </div>

          <div class="mb-3">
            <div class="flex items-center justify-between text-xs text-ink-soft mb-1.5">
              <span>Enrollment</span>
              <span class="font-medium">{{ center.enrolled ?? 0 }} / {{ center.capacity ?? 0 }}</span>
            </div>
            <div class="h-2 rounded-pill bg-surface-sunken overflow-hidden">
              <div
                class="h-full rounded-pill transition-all"
                :class="occupancyTone(occupancyPct(center))"
                :style="{ width: `${occupancyPct(center)}%` }"
              />
            </div>
          </div>

          <div class="flex items-center justify-between gap-2 text-sm text-ink-soft pt-3 border-t border-border/60">
            <div class="flex items-center gap-2 min-w-0">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4" />
              </svg>
              <span class="truncate" :class="managerNameOf(center) ? 'text-ink' : ''">{{ managerNameOf(center) || 'No manager assigned' }}</span>
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button
                v-if="!managerNameOf(center)"
                class="text-xs font-semibold text-primary-600 whitespace-nowrap"
                @click="openAssignManagerModal(center)"
              >
                Assign
              </button>
              <button
                class="text-xs font-medium text-primary-500 whitespace-nowrap"
                @click="openChildrenModal(center)"
              >
                View children
              </button>
            </div>
          </div>
        </BaseCard>
      </div>

      <EmptyState v-else title="No centers yet" message="Add your first center to get started." />
    </main>

    <!-- Children list modal -->
    <BaseModal v-model="showChildrenModal" :title="(childrenModalCenter?.name || 'Center') + ' — Children'" size="md">
      <div v-if="loadingChildren" class="space-y-2">
        <SkeletonBlock v-for="i in 3" :key="i" height="3.5rem" rounded="rounded-card" />
      </div>
      <div v-else-if="centerChildren.length" class="space-y-2 max-h-[60vh] overflow-y-auto -mx-1">
        <div
          v-for="child in centerChildren"
          :key="child.id"
          class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-sunken/40 transition-colors"
        >
          <img
            v-if="child.photoUrl"
            :src="resolveMediaUrl(child.photoUrl)"
            :alt="child.name"
            class="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
          <div
            v-else
            class="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600 font-display font-semibold text-sm flex-shrink-0"
          >
            {{ initials(child.name) }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-ink truncate">{{ child.name }}</p>
            <p class="text-xs text-ink-faint">{{ child.age ?? '—' }} yrs</p>
          </div>
        </div>
      </div>
      <p v-else class="text-sm text-ink-faint text-center py-6">No children assigned to this center.</p>
    </BaseModal>

    <!-- Edit center modal -->
    <BaseModal v-model="showEditModal" title="Edit center" size="sm" @close="showEditModal = false">
      <div class="space-y-4">
        <FormField label="Center name" required>
          <input
            v-model="editForm.name"
            type="text"
            class="w-full h-touch px-4 rounded-xl bg-surface border border-border text-sm focus:border-primary-400"
          />
        </FormField>
        <FormField label="Center code">
          <input
            v-model="editForm.code"
            type="text"
            class="w-full h-touch px-4 rounded-xl bg-surface border border-border text-sm focus:border-primary-400"
          />
        </FormField>
        <div class="grid grid-cols-2 gap-3">
          <FormField label="District" required>
            <input
              v-model="editForm.district"
              type="text"
              class="w-full h-touch px-4 rounded-xl bg-surface border border-border text-sm focus:border-primary-400"
            />
          </FormField>
          <FormField label="Sector" required>
            <input
              v-model="editForm.sector"
              type="text"
              class="w-full h-touch px-4 rounded-xl bg-surface border border-border text-sm focus:border-primary-400"
            />
          </FormField>
        </div>
        <FormField label="Address">
          <input
            v-model="editForm.address"
            type="text"
            class="w-full h-touch px-4 rounded-xl bg-surface border border-border text-sm focus:border-primary-400"
          />
        </FormField>
        <FormField label="Capacity">
          <input
            v-model="editForm.capacity"
            type="number"
            min="0"
            class="w-full h-touch px-4 rounded-xl bg-surface border border-border text-sm focus:border-primary-400"
          />
        </FormField>
        <p v-if="editError" class="text-sm text-danger-600">{{ editError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="outline" full-width @click="showEditModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" full-width :loading="savingEdit" @click="submitEditCenter">Save changes</BaseButton>
      </template>
    </BaseModal>

    <!-- Assign manager modal -->
    <BaseModal v-model="showAssignManagerModal" :title="'Assign manager — ' + (assignManagerTarget?.name || '')" size="sm">
      <div class="space-y-4">
        <div class="max-h-60 overflow-y-auto space-y-1.5">
          <button
            v-for="c in availableManagers"
            :key="c.id"
            type="button"
            class="w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left"
            :class="selectedManagerId === c.id ? 'border-primary-500 bg-primary-50' : 'border-border bg-surface-raised'"
            @click="selectedManagerId = c.id"
          >
            <img
              v-if="c.avatarUrl"
              :src="resolveMediaUrl(c.avatarUrl)"
              :alt="c.name"
              class="w-9 h-9 rounded-full object-cover flex-shrink-0"
            />
            <div
              v-else
              class="w-9 h-9 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600 font-display font-semibold text-xs flex-shrink-0"
            >
              {{ initials(c.name) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-ink truncate">{{ c.name }}</p>
              <p class="text-xs text-ink-faint">{{ c.phone }}</p>
            </div>
          </button>
          <p v-if="!availableManagers.length" class="text-sm text-ink-faint text-center py-4">No caregivers available.</p>
        </div>
        <p v-if="assignManagerError" class="text-sm text-danger-600">{{ assignManagerError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="outline" full-width @click="showAssignManagerModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" full-width :loading="assignManagerSaving" @click="submitAssignManager">Assign manager</BaseButton>
      </template>
    </BaseModal>

    <!-- Add center modal -->
    <BaseModal v-model="showAddModal" title="Add center" size="sm" @close="closeAddModal">
      <div class="space-y-4">
        <FormField label="Center name" required>
          <input
            v-model="newCenter.name"
            type="text"
            placeholder="e.g. Kicukiro ECD Center"
            class="w-full h-touch px-4 rounded-xl bg-surface border border-border text-sm focus:border-primary-400"
          />
        </FormField>
        <FormField label="Center code">
          <input
            v-model="newCenter.code"
            type="text"
            placeholder="e.g. KCK-001 (optional)"
            class="w-full h-touch px-4 rounded-xl bg-surface border border-border text-sm focus:border-primary-400"
          />
        </FormField>
        <div class="grid grid-cols-2 gap-3">
          <FormField label="District" required>
            <input
              v-model="newCenter.district"
              type="text"
              placeholder="e.g. Kicukiro"
              class="w-full h-touch px-4 rounded-xl bg-surface border border-border text-sm focus:border-primary-400"
            />
          </FormField>
          <FormField label="Sector" required>
            <input
              v-model="newCenter.sector"
              type="text"
              placeholder="e.g. Gatenga"
              class="w-full h-touch px-4 rounded-xl bg-surface border border-border text-sm focus:border-primary-400"
            />
          </FormField>
        </div>
        <FormField label="Address">
          <input
            v-model="newCenter.address"
            type="text"
            placeholder="Street / landmark (optional)"
            class="w-full h-touch px-4 rounded-xl bg-surface border border-border text-sm focus:border-primary-400"
          />
        </FormField>
        <FormField label="Capacity">
          <input
            v-model="newCenter.capacity"
            type="number"
            min="0"
            placeholder="e.g. 60 (optional)"
            class="w-full h-touch px-4 rounded-xl bg-surface border border-border text-sm focus:border-primary-400"
          />
        </FormField>
        <p v-if="createError" class="text-sm text-danger-600">{{ createError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="outline" full-width @click="closeAddModal">Cancel</BaseButton>
        <BaseButton variant="primary" full-width :loading="creating" @click="submitNewCenter">Add center</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
