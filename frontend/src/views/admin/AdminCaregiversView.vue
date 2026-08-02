<script setup>
import { onMounted, ref, computed } from 'vue'
import * as adminService from '@/services/api/admin.service'
import AdminTopBar from '@/components/layout/AdminTopBar.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import IconAddButton from '@/components/ui/IconAddButton.vue'
import { formatRwandaPhone, toCompactPhone, isCompleteRwandaPhone, blockNonDigitKey } from '@/composables/usePhoneFormat.js'
import { resolveMediaUrl } from '@/utils/mediaUrl.js'

const loading = ref(true)
const hasLoaded = ref(false)
const users = ref([])
const search = ref('')
const roleFilter = ref('')

async function load() {
  if (!hasLoaded.value) loading.value = true
  try {
    const res = await adminService.listUsers({
      search: search.value || undefined,
      role: roleFilter.value || undefined,
    })
    users.value = res.users
  } finally {
    loading.value = false
    hasLoaded.value = true
  }
}

onMounted(async () => {
  await Promise.all([load(), loadCenters(), loadPinResetRequests()])
})

const centers = ref([])
async function loadCenters() {
  try {
    centers.value = await adminService.listCenters()
  } catch {
    centers.value = []
  }
}

let searchTimeout = null
function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(load, 300)
}

const roleOptions = [
  { value: '', label: 'All roles' },
  { value: 'caregiver', label: 'Caregiver' },
  { value: 'field_officer', label: 'Field Officer' },
  { value: 'center_manager', label: 'Center Manager' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'admin', label: 'Admin' },
]

// Same set minus the blank "All roles" entry — used inside the create-user form
const createRoleOptions = roleOptions.filter((o) => o.value)

const roleLabels = {
  caregiver: 'Caregiver',
  field_officer: 'Field Officer',
  center_manager: 'Center Manager',
  supervisor: 'Supervisor',
  admin: 'Admin',
}

const roleTone = {
  caregiver: 'info',
  field_officer: 'info',
  center_manager: 'warning',
  supervisor: 'warning',
  admin: 'success',
}

function initials(name) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('')
}

function avatarSrc(user) {
  return resolveMediaUrl(user.avatarUrl)
}

function centerNameOf(user) {
  if (user.center?.name) return user.center.name
  if (user.center && !/^[a-f0-9]{24}$/i.test(user.center)) return user.center
  return '—'
}

// ---------- Status change confirmation (deactivate / reactivate) ----------
const showStatusModal = ref(false)
const statusTargetUser = ref(null)
const statusChanging = ref(false)
const statusError = ref('')

function openStatusModal(user) {
  statusTargetUser.value = user
  statusError.value = ''
  showStatusModal.value = true
}

async function confirmToggleActive() {
  const user = statusTargetUser.value
  if (!user) return
  const next = !user.isActive
  statusChanging.value = true
  statusError.value = ''
  try {
    if (next) {
      await adminService.updateUser(user.id, { isActive: true })
    } else {
      await adminService.deactivateUser(user.id)
    }
    user.isActive = next
    showStatusModal.value = false
  } catch (e) {
    statusError.value = e.message || 'Could not update this user. Please try again.'
  } finally {
    statusChanging.value = false
  }
}

// ---------- Remove user confirmation (only available once deactivated) ----------
const showRemoveModal = ref(false)
const removeTargetUser = ref(null)
const removing = ref(false)
const removeError = ref('')

function openRemoveModal(user) {
  removeTargetUser.value = user
  removeError.value = ''
  showRemoveModal.value = true
}

async function confirmRemoveUser() {
  const user = removeTargetUser.value
  if (!user) return
  removing.value = true
  removeError.value = ''
  try {
    await adminService.removeUser(user.id)
    users.value = users.value.filter((u) => u.id !== user.id)
    showRemoveModal.value = false
  } catch (e) {
    removeError.value = e.message || 'Could not remove this user. Please try again.'
  } finally {
    removing.value = false
  }
}

const activeCount = computed(() => users.value.filter((u) => u.isActive).length)

// ---------- Add user modal ----------
const showAddModal = ref(false)
const creating = ref(false)
const createError = ref('')
const newUser = ref({ name: '', phone: '', pin: '', role: 'caregiver', centerId: '' })

const centerOptions = computed(() =>
  centers.value.map((c) => ({ value: c.id, label: c.name }))
)

function openAddModal() {
  newUser.value = { name: '', phone: '+250 ', pin: '', role: 'caregiver', centerId: centers.value[0]?.id || '' }
  createError.value = ''
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
}

function onNewUserPhoneInput(e) {
  newUser.value.phone = formatRwandaPhone(e.target.value)
}

// ---------- PIN reset requests ----------
const pinResetRequests = ref([])
const loadingPinResets = ref(false)

async function loadPinResetRequests() {
  loadingPinResets.value = true
  try {
    pinResetRequests.value = await adminService.listPinResetRequests({ status: 'pending' })
  } catch {
    pinResetRequests.value = []
  } finally {
    loadingPinResets.value = false
  }
}

const showResetPinModal = ref(false)
const resettingPin = ref(false)
const resetPinError = ref('')
const activeResetRequest = ref(null)
const newPinValue = ref('')

function openResetPinModal(request) {
  activeResetRequest.value = request
  newPinValue.value = ''
  resetPinError.value = ''
  showResetPinModal.value = true
}

async function confirmResetPin() {
  resetPinError.value = ''
  if (!/^\d{4,6}$/.test(newPinValue.value.trim())) {
    resetPinError.value = 'New PIN must be 4-6 digits.'
    return
  }
  resettingPin.value = true
  try {
    if (activeResetRequest.value.id) {
      await adminService.resolvePinResetRequest(activeResetRequest.value.id, { newPin: newPinValue.value.trim() })
      await loadPinResetRequests()
    } else {
      await adminService.resetUserPin(activeResetRequest.value.user.id, { newPin: newPinValue.value.trim() })
    }
    showResetPinModal.value = false
  } catch (e) {
    resetPinError.value = e.message || 'Could not reset the PIN. Please try again.'
  } finally {
    resettingPin.value = false
  }
}

async function dismissResetRequest(request) {
  try {
    await adminService.cancelPinResetRequest(request.id)
    await loadPinResetRequests()
  } catch {
    // Best-effort — leave the request visible so the admin can retry
  }
}

async function submitNewUser() {
  createError.value = ''
  const { name, phone, pin, role, centerId } = newUser.value
  if (!name.trim() || !isCompleteRwandaPhone(phone) || !pin.trim()) {
    createError.value = 'Name, phone, and PIN are required.'
    return
  }
  if (!/^\d{4,6}$/.test(pin.trim())) {
    createError.value = 'PIN must be 4-6 digits.'
    return
  }
  creating.value = true
  try {
    await adminService.createUser({ name: name.trim(), phone: toCompactPhone(phone), pin: pin.trim(), role, centerId })
    showAddModal.value = false
    await load()
  } catch (e) {
    createError.value = e.message || 'Could not create the account. Please try again.'
  } finally {
    creating.value = false
  }
}

// ---------- Edit user modal (opened by clicking a caregiver card) ----------
const showEditModal = ref(false)
const editingUser = ref(null)
const savingEdit = ref(false)
const editError = ref('')
const editForm = ref({ name: '', phone: '', role: 'caregiver', centerId: '' })

function onEditPhoneInput(e) {
  editForm.value.phone = formatRwandaPhone(e.target.value)
}

function openEditModal(user) {
  editingUser.value = user
  editForm.value = {
    name: user.name || '',
    phone: formatRwandaPhone(user.phone || ''),
    role: user.role || 'caregiver',
    centerId: user.center?.id || user.center || centers.value[0]?.id || '',
  }
  editError.value = ''
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
}

async function submitEditUser() {
  editError.value = ''
  const { name, phone, role, centerId } = editForm.value
  if (!name.trim() || !isCompleteRwandaPhone(phone)) {
    editError.value = 'Name and phone are required.'
    return
  }
  savingEdit.value = true
  try {
    const updated = await adminService.updateUser(editingUser.value.id, {
      name: name.trim(),
      phone: toCompactPhone(phone),
      role,
      center: centerId,
    })
    const idx = users.value.findIndex((u) => u.id === editingUser.value.id)
    if (idx !== -1) users.value[idx] = { ...users.value[idx], ...updated }
    showEditModal.value = false
  } catch (e) {
    editError.value = e.message || 'Could not save changes. Please try again.'
  } finally {
    savingEdit.value = false
  }
}
</script>

<template>
  <div>
    <AdminTopBar title="Caregivers" />

    <main class="p-4 md:p-6 space-y-5 w-full">
      <!-- Toolbar -->
      <div class="space-y-3 w-full">
        <div class="flex items-center gap-2 w-full">
        <div class="relative flex-1 w-full">
          <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            v-model="search"
            type="search"
            placeholder="Search by name or phone"
            class="w-full h-9 pl-11 pr-4 rounded-full bg-surface-raised border border-border text-sm focus:border-primary-400"
            @input="onSearchInput"
          />
        </div>
        <IconAddButton label="Add user" @click="openAddModal" />
        </div>
        <div>
          <div class="flex-1">
            <BaseSelect v-model="roleFilter" :options="roleOptions" size="sm" @change="load" />
          </div>
        </div>
      </div>

      <!-- Pending PIN reset requests -->
      <BaseCard v-if="pinResetRequests.length" :padded="false">
        <div class="px-5 py-3 border-b border-border flex items-center gap-2">
          <svg class="w-4 h-4 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <h2 class="text-sm font-semibold text-ink">PIN reset requests</h2>
          <BaseBadge tone="warning">{{ pinResetRequests.length }} pending</BaseBadge>
        </div>
        <ul class="divide-y divide-border/60">
          <li
            v-for="request in pinResetRequests"
            :key="request.id"
            class="px-5 py-3 flex flex-wrap items-center justify-between gap-3"
          >
            <div class="min-w-0">
              <p class="font-medium text-ink truncate">{{ request.user?.name || 'Unknown user' }}</p>
              <p class="text-xs text-ink-faint">{{ request.phone }}</p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button
                class="text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-surface-sunken"
                @click="dismissResetRequest(request)"
              >
                Dismiss
              </button>
              <BaseButton variant="accent" size="sm" @click="openResetPinModal(request)">Reset PIN</BaseButton>
            </div>
          </li>
        </ul>
      </BaseCard>

      <p v-if="!loading" class="text-sm text-ink-soft">
        {{ users.length }} users · {{ activeCount }} active
      </p>

      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <SkeletonBlock v-for="i in 6" :key="i" height="10rem" rounded="rounded-card" />
      </div>

      <div v-else-if="users.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <BaseCard
          v-for="user in users"
          :key="user.id"
          interactive
          class="flex flex-col transition-shadow hover:shadow-card cursor-pointer"
          @click="openEditModal(user)"
        >
          <div class="flex items-start gap-3">
            <div class="relative flex-shrink-0">
              <img
                v-if="user.avatarUrl"
                :src="avatarSrc(user)"
                :alt="user.name"
                class="w-12 h-12 rounded-full object-cover"
              />
              <div
                v-else
                class="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600 font-display font-semibold text-sm"
              >
                {{ initials(user.name) }}
              </div>
              <span
                class="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-surface"
                :class="user.isActive ? 'bg-success-500' : 'bg-ink-faint/50'"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-medium text-ink truncate">{{ user.name }}</p>
              <div class="flex items-center gap-2 mt-1">
                <BaseBadge :tone="roleTone[user.role]">{{ roleLabels[user.role] }}</BaseBadge>
              </div>
            </div>
          </div>
          <div class="mt-3 space-y-1.5 text-sm">
            <div class="flex items-center gap-2 text-ink-soft">
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
              </svg>
              <span class="truncate">{{ centerNameOf(user) }}</span>
            </div>
            <div class="flex items-center gap-2 text-ink-soft">
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span class="truncate">{{ user.phone }}</span>
            </div>
          </div>
          <div class="mt-4 pt-3 border-t border-border/60 flex items-center gap-2">
            <button
              v-if="user.isActive"
              class="flex-1 text-xs font-bold px-3 py-2 rounded-lg border-2 border-primary-500 text-primary-600 hover:bg-primary-50 transition-colors"
              @click.stop="openResetPinModal({ id: null, user, phone: user.phone })"
            >
              Reset PIN
            </button>
            <button
              v-else
              class="flex-1 text-xs font-bold px-3 py-2 rounded-lg border-2 border-danger-500 text-danger-700 hover:bg-danger-50 transition-colors"
              @click.stop="openRemoveModal(user)"
            >
              Remove
            </button>
            <button
              class="flex-1 text-xs font-bold px-3 py-2 rounded-lg border-2 transition-colors"
              :class="user.isActive ? 'border-danger-500 text-danger-700 hover:bg-danger-50' : 'border-success-500 text-success-700 hover:bg-success-50'"
              @click.stop="openStatusModal(user)"
            >
              {{ user.isActive ? 'Deactivate' : 'Reactivate' }}
            </button>
          </div>
        </BaseCard>
      </div>

      <EmptyState v-else title="No users found" message="Try adjusting your search or filter." />
    </main>

    <BaseModal v-model="showAddModal" title="Add user" size="sm" @close="closeAddModal">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-ink mb-1.5">Full name</label>
          <input
            v-model="newUser.name"
            type="text"
            placeholder="e.g. Grace Uwimana"
            class="w-full h-touch px-4 rounded-xl bg-surface border border-border text-sm focus:border-primary-400"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink mb-1.5">Phone number</label>
          <input
            :value="newUser.phone"
            type="tel"
            inputmode="numeric"
            pattern="[0-9\s+]*"
            maxlength="17"
            placeholder="+250 7__ ___ ___"
            class="w-full h-touch px-4 rounded-xl bg-surface border border-border text-sm focus:border-primary-400"
            @input="onNewUserPhoneInput"
            @keydown="blockNonDigitKey"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink mb-1.5">PIN</label>
          <input
            v-model="newUser.pin"
            type="password"
            inputmode="numeric"
            maxlength="6"
            placeholder="4-6 digits"
            class="w-full h-touch px-4 rounded-xl bg-surface border border-border text-sm tracking-widest focus:border-primary-400"
          />
          <p class="text-xs text-ink-faint mt-1">The new user signs in with this phone number and PIN. They can change it later from their profile.</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-ink mb-1.5">Role</label>
          <BaseSelect v-model="newUser.role" :options="createRoleOptions" size="sm" />
        </div>
        <div v-if="centerOptions.length">
          <label class="block text-sm font-medium text-ink mb-1.5">Center</label>
          <BaseSelect v-model="newUser.centerId" :options="centerOptions" placeholder="Select a center" size="sm" />
        </div>

        <p v-if="createError" class="text-sm text-danger-600">{{ createError }}</p>
      </div>

      <template #footer>
        <BaseButton variant="outline" full-width @click="closeAddModal">Cancel</BaseButton>
        <BaseButton variant="primary" full-width :loading="creating" @click="submitNewUser">Create account</BaseButton>
      </template>
    </BaseModal>

    <BaseModal v-model="showEditModal" title="Edit user" size="sm" @close="closeEditModal">
      <div v-if="editingUser" class="space-y-4">
        <div class="flex items-center gap-3">
          <img
            v-if="editingUser.avatarUrl"
            :src="avatarSrc(editingUser)"
            :alt="editingUser.name"
            class="w-12 h-12 rounded-full object-cover"
          />
          <div
            v-else
            class="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600 font-display font-semibold text-sm"
          >
            {{ initials(editingUser.name) }}
          </div>
          <div class="min-w-0">
            <p class="font-medium text-ink truncate">{{ editingUser.name }}</p>
            <BaseBadge :tone="roleTone[editingUser.role]">{{ roleLabels[editingUser.role] }}</BaseBadge>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-ink mb-1.5">Full name</label>
          <input
            v-model="editForm.name"
            type="text"
            class="w-full h-touch px-4 rounded-xl bg-surface border border-border text-sm focus:border-primary-400"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink mb-1.5">Phone number</label>
          <input
            :value="editForm.phone"
            type="tel"
            inputmode="numeric"
            pattern="[0-9\s+]*"
            maxlength="17"
            class="w-full h-touch px-4 rounded-xl bg-surface border border-border text-sm focus:border-primary-400"
            @input="onEditPhoneInput"
            @keydown="blockNonDigitKey"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink mb-1.5">Role</label>
          <BaseSelect v-model="editForm.role" :options="createRoleOptions" size="sm" />
        </div>
        <div v-if="centerOptions.length">
          <label class="block text-sm font-medium text-ink mb-1.5">Center</label>
          <BaseSelect v-model="editForm.centerId" :options="centerOptions" placeholder="Select a center" size="sm" />
        </div>

        <p v-if="editError" class="text-sm text-danger-600">{{ editError }}</p>
      </div>

      <template #footer>
        <BaseButton variant="outline" full-width @click="closeEditModal">Cancel</BaseButton>
        <BaseButton variant="primary" full-width :loading="savingEdit" @click="submitEditUser">Save changes</BaseButton>
      </template>
    </BaseModal>

    <BaseModal v-model="showResetPinModal" title="Reset PIN" size="sm">
      <div class="space-y-4">
        <p class="text-sm text-ink-soft">
          Set a new PIN for
          <span class="font-medium text-ink">{{ activeResetRequest?.user?.name }}</span>.
          They'll need to sign in with this new PIN — all their other sessions will be signed out.
        </p>
        <div>
          <label class="block text-sm font-medium text-ink mb-1.5">New PIN</label>
          <input
            v-model="newPinValue"
            type="password"
            inputmode="numeric"
            maxlength="6"
            placeholder="4-6 digits"
            class="w-full h-touch px-4 rounded-xl bg-surface border border-border text-sm tracking-widest focus:border-primary-400"
          />
        </div>
        <p v-if="resetPinError" class="text-sm text-danger-600">{{ resetPinError }}</p>
      </div>

      <template #footer>
        <BaseButton variant="outline" full-width @click="showResetPinModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" full-width :loading="resettingPin" @click="confirmResetPin">Reset PIN</BaseButton>
      </template>
    </BaseModal>

    <!-- Deactivate / Reactivate confirmation -->
    <BaseModal
      v-model="showStatusModal"
      :title="statusTargetUser?.isActive ? 'Deactivate user' : 'Reactivate user'"
      size="sm"
    >
      <div class="space-y-3">
        <p class="text-sm text-ink-soft">
          <template v-if="statusTargetUser?.isActive">
            Are you sure you want to deactivate
            <span class="font-medium text-ink">{{ statusTargetUser?.name }}</span>? They will no longer be able to
            sign in until reactivated.
          </template>
          <template v-else>
            Reactivate
            <span class="font-medium text-ink">{{ statusTargetUser?.name }}</span>? They will be able to sign in
            again immediately.
          </template>
        </p>
        <p v-if="statusError" class="text-sm text-danger-600">{{ statusError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="outline" full-width @click="showStatusModal = false">Cancel</BaseButton>
        <BaseButton
          :variant="statusTargetUser?.isActive ? 'danger' : 'primary'"
          full-width
          :loading="statusChanging"
          @click="confirmToggleActive"
        >
          {{ statusTargetUser?.isActive ? 'Deactivate' : 'Reactivate' }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Remove user confirmation -->
    <BaseModal v-model="showRemoveModal" title="Remove user" size="sm">
      <div class="space-y-3">
        <p class="text-sm text-ink-soft">
          This will permanently remove
          <span class="font-medium text-ink">{{ removeTargetUser?.name }}</span> and cannot be undone. All children
          assigned to them, along with their attendance, meals, health alerts, visits, and reports, will also be
          permanently deleted.
        </p>
        <p v-if="removeError" class="text-sm text-danger-600">{{ removeError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="outline" full-width @click="showRemoveModal = false">Cancel</BaseButton>
        <BaseButton variant="danger" full-width :loading="removing" @click="confirmRemoveUser">Remove</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
