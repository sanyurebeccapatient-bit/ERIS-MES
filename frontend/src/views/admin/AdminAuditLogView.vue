<script setup>
import { onMounted, ref } from 'vue'
import * as adminService from '@/services/api/admin.service'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const loading = ref(true)
const hasLoaded = ref(false)
const logs = ref([])
const total = ref(0)

async function load() {
  if (!hasLoaded.value) loading.value = true
  try {
    const res = await adminService.listAuditLog()
    logs.value = res.logs
    total.value = res.total
  } finally {
    loading.value = false
    hasLoaded.value = true
  }
}

onMounted(load)

// ---------- Clear logs confirmation ----------
const showClearModal = ref(false)
const clearing = ref(false)
const clearError = ref('')

function openClearModal() {
  clearError.value = ''
  showClearModal.value = true
}

async function confirmClearLogs() {
  clearing.value = true
  clearError.value = ''
  try {
    await adminService.clearAuditLog()
    showClearModal.value = false
    await load()
  } catch (e) {
    clearError.value = e.message || 'Could not clear the audit log. Please try again.'
  } finally {
    clearing.value = false
  }
}

const actionTone = {
  'report.approved': 'success',
  'report.rejected': 'danger',
  'user.role_change': 'warning',
  'user.deactivate': 'danger',
  'user.create': 'info',
  'center.create': 'info',
}

function toneFor(action) {
  return actionTone[action] || 'neutral'
}

function actionLabel(action) {
  return action.replace(/\./g, ' → ').replace(/_/g, ' ')
}

// Human-readable entity kind, e.g. "User" -> "User account", "Center" -> "Center".
const entityKindLabels = {
  User: 'User account',
  Center: 'Center',
  Report: 'Report',
  Child: 'Child',
  HealthAlert: 'Health alert',
  Visit: 'Visit',
  Notification: 'Notification',
}

// Builds a short, human-readable summary of what an audit entry affected,
// instead of dumping the raw { kind, id } object or a bare Mongo ObjectId.
function entitySummary(log) {
  const kind = log.entity?.kind
  const meta = log.metadata || {}
  if (!kind) return null

  const label = entityKindLabels[kind] || kind
  if (meta.name) return `${label}: ${meta.name}`
  if (meta.role) return `${label} role changed to ${String(meta.role).replace('_', ' ')}`
  if (meta.from && meta.to) return `${label}: ${meta.from} → ${meta.to}`
  return label
}

function actorName(log) {
  return log.actor?.name || 'System'
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}
</script>

<template>
  <div>

    <main class="p-4 md:p-6 space-y-5 max-w-[1000px]">
      <div v-if="!loading" class="flex items-center justify-between gap-3">
        <p class="text-sm text-ink-soft">{{ total }} recorded actions</p>
        <BaseButton v-if="logs.length" variant="outline" size="sm" @click="openClearModal">Clear logs</BaseButton>
      </div>

      <BaseCard v-if="loading" :padded="false">
        <div class="p-4 space-y-3">
          <SkeletonBlock v-for="i in 5" :key="i" height="3rem" />
        </div>
      </BaseCard>

      <div v-else-if="logs.length" class="relative">
        <!-- Timeline -->
        <div class="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
        <div class="space-y-4">
          <div v-for="log in logs" :key="log.id" class="relative flex gap-4 pl-0">
            <div class="w-8 h-8 rounded-full bg-surface-raised border-2 border-border flex items-center justify-center flex-shrink-0 z-10">
              <span class="w-2 h-2 rounded-full bg-primary-500" />
            </div>
            <BaseCard class="flex-1 !py-3">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-ink capitalize">{{ actionLabel(log.action) }}</p>
                  <p v-if="entitySummary(log)" class="text-xs text-ink-soft mt-0.5">{{ entitySummary(log) }}</p>
                  <p class="text-xs text-ink-faint mt-1">{{ actorName(log) }} · {{ formatDateTime(log.createdAt) }}</p>
                </div>
                <BaseBadge :tone="toneFor(log.action)">{{ log.action.split('.')[0] }}</BaseBadge>
              </div>
            </BaseCard>
          </div>
        </div>
      </div>

      <EmptyState v-else title="No audit entries yet" message="Sensitive actions will appear here as they happen." />
    </main>

    <!-- Clear logs confirmation -->
    <BaseModal v-model="showClearModal" title="Clear audit log" size="sm">
      <div class="space-y-3">
        <p class="text-sm text-ink-soft">
          This will permanently delete all {{ total }} recorded actions and cannot be undone.
        </p>
        <p v-if="clearError" class="text-sm text-danger-600">{{ clearError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="outline" full-width @click="showClearModal = false">Cancel</BaseButton>
        <BaseButton variant="danger" full-width :loading="clearing" @click="confirmClearLogs">Clear logs</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
