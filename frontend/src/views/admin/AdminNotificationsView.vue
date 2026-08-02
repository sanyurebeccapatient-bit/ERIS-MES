<script setup>
import { onMounted, ref, computed } from 'vue'
import * as adminService from '@/services/api/admin.service'
import { listUsers } from '@/services/api/admin.service'
import AdminTopBar from '@/components/layout/AdminTopBar.vue'
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
const notifications = ref([])
const stats = ref({ total: 0, unread: 0, byType: [] })
const typeFilter = ref('')
const deleting = ref(null)

// ---- Send notification modal ----
const showSendModal = ref(false)
const sending = ref(false)
const sendError = ref('')
const users = ref([])
const selectedUserIds = ref([])
const newNotification = ref({ title: '', body: '', type: 'system' })

const typeOptions = [
  { value: '', label: 'All types' },
  { value: 'health', label: 'Health' },
  { value: 'visit', label: 'Visit' },
  { value: 'report', label: 'Report' },
  { value: 'alert', label: 'Alert' },
  { value: 'system', label: 'System' },
]

const sendTypeOptions = [
  { value: 'system', label: 'System' },
  { value: 'health', label: 'Health' },
  { value: 'visit', label: 'Visit' },
  { value: 'report', label: 'Report' },
  { value: 'alert', label: 'Alert' },
]

const roleOptions = [
  { value: '', label: 'All roles' },
  { value: 'caregiver', label: 'Caregivers' },
  { value: 'field_officer', label: 'Field Officers' },
  { value: 'admin', label: 'Admins' },
]
const roleFilter = ref('')

const userOptions = computed(() =>
  users.value.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` }))
)

const typeTone = {
  health: 'danger',
  visit: 'info',
  report: 'warning',
  alert: 'danger',
  system: 'neutral',
  sync: 'neutral',
}

function openSendModal() {
  newNotification.value = { title: '', body: '', type: 'system' }
  selectedUserIds.value = []
  sendError.value = ''
  showSendModal.value = true
}

async function sendNotification() {
  if (!newNotification.value.title.trim()) {
    sendError.value = 'Title is required.'
    return
  }
  if (selectedUserIds.value.length === 0) {
    sendError.value = 'Select at least one recipient.'
    return
  }
  sending.value = true
  sendError.value = ''
  try {
    await adminService.sendNotification({
      userIds: selectedUserIds.value,
      title: newNotification.value.title.trim(),
      body: newNotification.value.body.trim(),
      type: newNotification.value.type,
    })
    showSendModal.value = false
    await load()
  } catch (e) {
    sendError.value = e.message || 'Could not send notification.'
  } finally {
    sending.value = false
  }
}

async function load() {
  // Only blank out to the skeleton on the very first load — subsequent
  // filter changes and refreshes update the list in place so the stats
  // strip and cards don't flash back to a loading state.
  if (!hasLoaded.value) loading.value = true
  try {
    const params = {}
    if (typeFilter.value) params.type = typeFilter.value
    if (roleFilter.value) {
      // Filter by user role — we need user ids first
      const allUsers = await adminService.listUsers({ role: roleFilter.value })
      if (allUsers.users?.length) {
        params.userId = allUsers.users.map(u => u.id).join(',')
      }
    }
    const [notifs, notifStats] = await Promise.all([
      adminService.listAllNotifications(params),
      adminService.getNotificationStats(),
    ])
    notifications.value = notifs
    stats.value = notifStats
  } finally {
    loading.value = false
    hasLoaded.value = true
  }
}

onMounted(async () => {
  await load()
  try {
    const res = await adminService.listUsers()
    users.value = res.users || []
  } catch { /* non-critical */ }
})

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

async function deleteNotif(id) {
  deleting.value = id
  try {
    await adminService.deleteNotification(id)
    notifications.value = notifications.value.filter(n => n.id !== id)
  } finally {
    deleting.value = null
  }
}

// ---- Delete confirmation ----
const showDeleteModal = ref(false)
const deleteTargetId = ref(null)

function openDeleteModal(id) {
  deleteTargetId.value = id
  showDeleteModal.value = true
}

async function confirmDeleteNotif() {
  if (!deleteTargetId.value) return
  const id = deleteTargetId.value
  showDeleteModal.value = false
  await deleteNotif(id)
}

function toggleSelectAll() {
  if (selectedUserIds.value.length === users.value.length) {
    selectedUserIds.value = []
  } else {
    selectedUserIds.value = users.value.map(u => u.id)
  }
}
</script>

<template>
  <div>
    <AdminTopBar title="Notifications" />

    <main class="p-4 md:p-6 space-y-5 max-w-[1000px]">
      <!-- Stats strip -->
      <div v-if="!loading" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <BaseCard class="text-center !py-3">
          <p class="text-xl font-display font-bold text-ink">{{ stats.total }}</p>
          <p class="text-xs text-ink-soft">Total sent</p>
        </BaseCard>
        <BaseCard class="text-center !py-3">
          <p class="text-xl font-display font-bold text-accent-600">{{ stats.unread }}</p>
          <p class="text-xs text-ink-soft">Unread</p>
        </BaseCard>
        <BaseCard class="text-center !py-3 col-span-2 sm:col-span-1">
          <p class="text-xl font-display font-bold text-primary-600">{{ stats.byType?.length || 0 }}</p>
          <p class="text-xs text-ink-soft">Categories</p>
        </BaseCard>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex gap-2 overflow-x-auto flex-1 -mx-4 px-4 pb-1">
          <PillFilterButton
            v-for="opt in typeOptions"
            :key="opt.value"
            :active="typeFilter === opt.value"
            @click="typeFilter = opt.value; load()"
          >
            {{ opt.label }}
          </PillFilterButton>
        </div>
        <IconAddButton label="Send notification" @click="openSendModal" />
      </div>

      <div v-if="loading" class="space-y-2.5">
        <SkeletonBlock v-for="i in 4" :key="i" height="5rem" rounded="rounded-card" />
      </div>

      <div v-else-if="notifications.length" class="space-y-2.5">
        <BaseCard v-for="n in notifications" :key="n.id">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="font-medium text-ink">{{ n.title }}</p>
                <BaseBadge :tone="typeTone[n.type] || 'neutral'">{{ n.type }}</BaseBadge>
                <BaseBadge v-if="n.read" tone="success" size="sm">read</BaseBadge>
              </div>
              <p class="text-xs text-ink-soft mt-0.5">{{ n.user?.name || 'Unknown user' }} · {{ n.user?.role || '' }}</p>
              <p v-if="n.body" class="text-sm text-ink-soft mt-1.5">{{ n.body }}</p>
              <p class="text-xs text-ink-faint mt-1.5">{{ formatDate(n.createdAt) }}</p>
            </div>
            <button
              class="text-xs font-medium text-danger-600 disabled:opacity-50 flex-shrink-0"
              :disabled="deleting === n.id"
              @click="openDeleteModal(n.id)"
            >
              Delete
            </button>
          </div>
        </BaseCard>
      </div>

      <EmptyState v-else title="No notifications" message="Send your first notification to caregivers." />
    </main>

    <!-- Send notification modal -->
    <BaseModal v-model="showSendModal" title="Send notification">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-ink mb-1.5">Recipients</label>
          <div class="flex items-center justify-between mb-2">
            <button class="text-xs font-medium text-primary-600" @click="toggleSelectAll">
              {{ selectedUserIds.length === users.length ? 'Deselect all' : 'Select all' }}
            </button>
            <span class="text-xs text-ink-faint">{{ selectedUserIds.length }} selected</span>
          </div>
          <div class="max-h-40 overflow-y-auto border border-border rounded-xl p-2 space-y-1">
            <label
              v-for="u in users"
              :key="u.id"
              class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-sunken cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                :value="u.id"
                :checked="selectedUserIds.includes(u.id)"
                class="rounded border-border text-primary-500 focus:ring-primary-400"
                @change="(e) => {
                  if (e.target.checked) selectedUserIds.push(u.id)
                  else selectedUserIds = selectedUserIds.filter(id => id !== u.id)
                }"
              />
              <span class="text-ink">{{ u.name }}</span>
              <span class="text-xs text-ink-faint">({{ u.role }})</span>
            </label>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-ink mb-1.5">Type</label>
          <BaseSelect v-model="newNotification.type" :options="sendTypeOptions" size="sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink mb-1.5">Title</label>
          <input
            v-model="newNotification.title"
            type="text"
            placeholder="Notification title"
            class="w-full h-touch px-4 rounded-xl bg-surface border border-border text-sm focus:border-primary-400"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink mb-1.5">Message</label>
          <textarea
            v-model="newNotification.body"
            rows="3"
            placeholder="Notification body (optional)"
            class="w-full p-4 rounded-xl bg-surface border border-border text-sm focus:border-primary-400 resize-none"
          />
        </div>
        <p v-if="sendError" class="text-sm text-danger-600">{{ sendError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="outline" full-width @click="showSendModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" full-width :loading="sending" @click="sendNotification">Send</BaseButton>
      </template>
    </BaseModal>

    <!-- Delete confirmation -->
    <BaseModal v-model="showDeleteModal" title="Delete notification" size="sm">
      <p class="text-sm text-ink-soft">This notification will be permanently deleted. This cannot be undone.</p>
      <template #footer>
        <BaseButton variant="outline" full-width @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton variant="danger" full-width :loading="deleting === deleteTargetId" @click="confirmDeleteNotif">Delete</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
