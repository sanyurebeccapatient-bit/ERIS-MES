<script setup>
import { onMounted, ref } from 'vue'
import * as adminService from '@/services/api/admin.service'
import AdminTopBar from '@/components/layout/AdminTopBar.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import FormField from '@/components/forms/FormField.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import IconAddButton from '@/components/ui/IconAddButton.vue'

const loading = ref(true)
const hasLoaded = ref(false)
const centers = ref([])

async function load() {
  if (!hasLoaded.value) loading.value = true
  try {
    centers.value = await adminService.listCenters()
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
    <AdminTopBar title="Centers" />

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
            <div class="min-w-0">
              <h3 class="font-display font-semibold text-ink truncate">{{ center.name }}</h3>
              <p class="text-xs text-ink-faint">{{ center.code }} · {{ center.district }}, {{ center.sector }}</p>
            </div>
            <BaseBadge :tone="center.isActive ? 'success' : 'neutral'">
              {{ center.isActive ? 'Active' : 'Inactive' }}
            </BaseBadge>
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

          <div class="flex items-center gap-2 text-sm text-ink-soft pt-3 border-t border-border/60">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4" />
            </svg>
            <span class="truncate">{{ managerNameOf(center) || 'No manager assigned' }}</span>
          </div>
        </BaseCard>
      </div>

      <EmptyState v-else title="No centers yet" message="Add your first center to get started." />
    </main>

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
