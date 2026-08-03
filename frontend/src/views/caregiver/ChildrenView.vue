<script setup>
import { onMounted, ref, reactive, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  listChildren,
  createChild as apiCreateChild,
  updateChild as apiUpdateChild,
  deleteChild as apiDeleteChild,
} from '@/services/api/children.service'
import { useAuthStore } from '@/stores/auth'
import { useI18n, refreshKey } from '@/i18n/index.js'
import AppTopBar from '@/components/layout/AppTopBar.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import FormField from '@/components/forms/FormField.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PhotoCapture from '@/components/forms/PhotoCapture.vue'
import { formatRwandaPhone, toCompactPhone, blockNonDigitKey } from '@/composables/usePhoneFormat.js'
import { resolveMediaUrl } from '@/utils/mediaUrl.js'

const authStore = useAuthStore()
const router = useRouter()
const { t } = useI18n()
const loading = ref(true)
const hasLoaded = ref(false)
const children = ref([])
const query = ref('')
const errorMessage = ref('')

async function load() {
  if (!hasLoaded.value) loading.value = true
  errorMessage.value = ''
  try {
    const fresh = await listChildren()
    if (hasLoaded.value) {
      // Merge: add new items, update existing, keep order stable
      const existingIds = new Set(children.value.map(c => c.id))
      for (const c of fresh) {
        const idx = children.value.findIndex(x => x.id === c.id)
        if (idx !== -1) children.value[idx] = c
        else children.value.push(c)
      }
    } else {
      children.value = fresh
    }
  } catch (e) {
    errorMessage.value = e.message || t('common.error')
  } finally {
    loading.value = false
    hasLoaded.value = true
  }
}

onMounted(load)

const filtered = computed(() =>
  children.value.filter((c) => c.name.toLowerCase().includes(query.value.toLowerCase()))
)

function initials(name) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('')
}

function childCountText() {
  const n = filtered.value.length
  if (n === 1) return t('children.childCount', { n: 1 }).split('|')[0].trim()
  return t('children.childCount', { n: 2 }).split('|')[1]?.trim() || `${n} ${t('common.children').toLowerCase()}`
}

function healthLabel(flag) {
  if (flag === 'high' || flag === 'critical') return t('children.urgent')
  if (flag === 'medium') return t('children.followUp')
  return t('children.low')
}

// ---------------------------------------------------------------------
// Add / Edit modal
// ---------------------------------------------------------------------
const showFormModal = ref(false)
const formMode = ref('add')
const saving = ref(false)
const formError = ref('')
const activeChild = ref(null)

const emptyForm = () => ({
  name: '',
  age: '',
  gender: 'F',
  guardianName: '',
  guardianPhone: '+250 ',
  healthFlag: '',
})
const form = reactive(emptyForm())

function onGuardianPhoneInput(e) {
  form.guardianPhone = formatRwandaPhone(e.target.value)
}

const genderOptions = computed(() => [
  { value: 'F', label: t('children.female') },
  { value: 'M', label: t('children.male') },
  { value: 'other', label: t('children.other') },
])

const healthFlagOptions = computed(() => [
  { value: '', label: t('children.none') },
  { value: 'low', label: t('children.low') },
  { value: 'medium', label: t('children.medium') },
  { value: 'high', label: t('children.high') },
])

function openAddModal() {
  formMode.value = 'add'
  Object.assign(form, emptyForm())
  formError.value = ''
  activeChild.value = null
  showFormModal.value = true
}

function openEditModal(child) {
  formMode.value = 'edit'
  activeChild.value = child
  Object.assign(form, {
    name: child.name || '',
    age: child.age ?? '',
    gender: child.gender || 'F',
    guardianName: child.guardian?.name || child.guardian || '',
    guardianPhone: formatRwandaPhone(child.guardian?.phone || child.guardianPhone || ''),
    healthFlag: child.healthFlag || '',
  })
  formError.value = ''
  showFormModal.value = true
}

async function submitForm() {
  if (!form.name.trim()) {
    formError.value = t('children.nameRequired')
    return
  }
  if (!form.guardianName.trim()) {
    formError.value = t('children.guardianRequired')
    return
  }

  saving.value = true
  formError.value = ''
  const payload = {
    name: form.name.trim(),
    age: form.age === '' ? undefined : Number(form.age),
    gender: form.gender,
    guardian: {
      name: form.guardianName.trim(),
      phone: toCompactPhone(form.guardianPhone),
    },
    healthFlag: form.healthFlag || null,
  }
  const ownCenter = authStore.user?.center?.id || authStore.user?.center
  if (ownCenter) payload.center = ownCenter

  try {
    if (formMode.value === 'add') {
      await apiCreateChild(payload)
      children.value = await listChildren()
    } else {
      const updated = await apiUpdateChild(activeChild.value.id, payload)
      const idx = children.value.findIndex((c) => c.id === activeChild.value.id)
      if (idx !== -1) children.value[idx] = { ...children.value[idx], ...updated }
    }
    showFormModal.value = false
  } catch (e) {
    formError.value = e.message || t('common.error')
  } finally {
    saving.value = false
  }
}

// ---------------------------------------------------------------------
// View details modal
// ---------------------------------------------------------------------
const showDetailModal = ref(false)
function openDetail(child) {
  activeChild.value = child
  showDetailModal.value = true
}

function editFromDetail() {
  showDetailModal.value = false
  openEditModal(activeChild.value)
}

// ---------------------------------------------------------------------
// Photo modal (upload / capture)
// ---------------------------------------------------------------------
const showPhotoModal = ref(false)
const photoSaving = ref(false)
const photoChild = ref(null)
const capturedPhoto = ref(null)

function openPhotoModal(child, event) {
  if (event) event.stopPropagation()
  photoChild.value = child
  capturedPhoto.value = null
  showPhotoModal.value = true
}

const capturedBlob = ref(null)

function onPhotoCaptured(dataUrl, blob) {
  capturedPhoto.value = dataUrl
  capturedBlob.value = blob
}

async function savePhoto(retryCount = 0) {
  if (!capturedPhoto.value || !photoChild.value) return
  photoSaving.value = true
  try {
    let finalUrl = capturedPhoto.value

    // Upload the actual file first (so we store a real URL, not a giant data URL)
    if (capturedBlob.value) {
      try {
        const formData = new FormData()
        formData.append('photo', capturedBlob.value, 'child-photo.jpg')
        formData.append('context', 'children')
        const { apiClient } = await import('@/services/api/client.js')
        const resp = await apiClient._rawPost('/upload/photo', formData)
        if (resp?.url) finalUrl = resp.url
      } catch {
        // Fall back to sending the raw data URL directly if the upload endpoint is unavailable
      }
    }

    const updated = await apiUpdateChild(photoChild.value.id, { photoUrl: finalUrl })
    const idx = children.value.findIndex((c) => c.id === photoChild.value.id)
    if (idx !== -1) children.value[idx] = { ...children.value[idx], ...updated, photoUrl: updated?.photoUrl || finalUrl }
    if (activeChild.value && activeChild.value.id === photoChild.value.id) {
      activeChild.value = { ...activeChild.value, ...updated, photoUrl: updated?.photoUrl || finalUrl }
    }
    showPhotoModal.value = false
  } catch (e) {
    if (retryCount < 2) {
      await new Promise((r) => setTimeout(r, 1000 * (retryCount + 1)))
      photoSaving.value = false
      return savePhoto(retryCount + 1)
    }
    formError.value = e.message || t('common.error')
  } finally {
    photoSaving.value = false
  }
}

// ---------------------------------------------------------------------
// Delete confirmation modal
// ---------------------------------------------------------------------
const showDeleteModal = ref(false)
const deleting = ref(false)
const deleteError = ref('')

function openDeleteModal(child) {
  activeChild.value = child
  deleteError.value = ''
  showDeleteModal.value = true
}

async function confirmDelete() {
  deleting.value = true
  deleteError.value = ''
  try {
    await apiDeleteChild(activeChild.value.id)
    children.value = children.value.filter((c) => c.id !== activeChild.value.id)
    showDeleteModal.value = false
  } catch (e) {
    deleteError.value = e.message || t('common.error')
  } finally {
    deleting.value = false
  }
}

function isRawObjectId(value) {
  return typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value)
}

function centerNameOf(child) {
  if (child.center?.name) return child.center.name
  if (child.center && !isRawObjectId(child.center)) return child.center
  return '—'
}

function guardianNameOf(child) {
  return child.guardian?.name || child.guardian || '—'
}

// Expose refreshKey for language change reactivity
const localeKey = refreshKey
</script>

<template>
  <div :key="'children-' + localeKey">
    <AppTopBar :title="t('children.title')" />

    <main class="px-4 pt-4 pb-8 space-y-4">
      <!-- Search + Add -->
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            v-model="query"
            type="search"
            :placeholder="t('children.searchPlaceholder')"
            class="w-full h-9 pl-11 pr-4 rounded-full bg-surface-raised border border-border text-base placeholder:text-ink-faint focus:border-primary-400"
          />
        </div>
        <button
          class="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center flex-shrink-0 active:bg-primary-600"
          :aria-label="t('children.addChild')"
          @click="openAddModal"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.25">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <p v-if="errorMessage" class="text-sm text-danger-600">{{ errorMessage }}</p>

      <div v-if="loading" class="space-y-2.5">
        <SkeletonBlock v-for="i in 5" :key="i" height="4.5rem" rounded="rounded-card" />
      </div>

      <template v-else>
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs font-medium text-ink-faint uppercase tracking-wide truncate">
            {{ childCountText() }}
          </p>
          <button
            class="flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full bg-success-500/10 text-success-600 text-xs font-medium flex-shrink-0 active:bg-success-500/20 transition-colors"
            @click="router.push({ name: 'attendance-reports' })"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            {{ t('attendance.viewReports') }}
          </button>
        </div>

        <div v-if="filtered.length" class="space-y-2.5">
          <BaseCard v-for="child in filtered" :key="child.id" interactive class="flex items-center gap-3" @click="openDetail(child)">
            <div class="relative flex-shrink-0" @click.stop="openPhotoModal(child, $event)">
              <img
                v-if="child.photoUrl"
                :src="resolveMediaUrl(child.photoUrl)"
                :alt="child.name"
                class="w-12 h-12 rounded-full object-cover"
              />
              <div
                v-else
                class="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600 font-display font-semibold"
              >
                {{ initials(child.name) }}
              </div>
              <span
                v-if="!child.photoUrl"
                class="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-sm"
              >
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-medium text-ink truncate">{{ child.name }}</p>
              <p class="text-xs text-ink-soft">{{ child.age ?? '—' }} {{ t('children.yrs') }} · {{ t('common.guardian') }}: {{ guardianNameOf(child) }}</p>
            </div>
            <BaseBadge v-if="child.healthFlag" :tone="child.healthFlag === 'high' || child.healthFlag === 'critical' ? 'danger' : child.healthFlag === 'medium' ? 'warning' : 'info'">
              {{ healthLabel(child.healthFlag) }}
            </BaseBadge>
            <button
              class="touch-target -mr-2 flex-shrink-0"
              :aria-label="t('common.edit')"
              @click.stop="openEditModal(child)"
            >
              <svg class="w-5 h-5 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </BaseCard>
        </div>

        <EmptyState
          v-else
          :title="t('children.noChildren')"
          :message="t('children.noChildrenDesc')"
        >
          <template #action>
            <BaseButton variant="primary" size="sm" @click="openAddModal">{{ t('children.addChild') }}</BaseButton>
          </template>
        </EmptyState>
      </template>
    </main>

    <!-- Add / Edit modal -->
    <BaseModal v-model="showFormModal" :title="formMode === 'add' ? t('children.addChild') : t('children.editChild')">
      <form class="space-y-4" @submit.prevent="submitForm">
        <FormField :label="t('children.childName')" required>
          <input
            v-model="form.name"
            type="text"
            :placeholder="t('children.childNamePlaceholder')"
            class="w-full h-touch-lg px-4 rounded-xl bg-surface border border-border text-base focus:border-primary-400"
          />
        </FormField>
        <div class="grid grid-cols-2 gap-3">
          <FormField :label="t('children.age')">
            <input
              v-model="form.age"
              type="number"
              min="0"
              max="18"
              :placeholder="t('children.agePlaceholder')"
              class="w-full h-touch-lg px-4 rounded-xl bg-surface border border-border text-base focus:border-primary-400"
            />
          </FormField>
          <FormField :label="t('children.gender')">
            <BaseSelect v-model="form.gender" :options="genderOptions" />
          </FormField>
        </div>
        <FormField :label="t('children.guardianName')" required>
          <input
            v-model="form.guardianName"
            type="text"
            :placeholder="t('children.guardianNamePlaceholder')"
            class="w-full h-touch-lg px-4 rounded-xl bg-surface border border-border text-base focus:border-primary-400"
          />
        </FormField>
        <FormField :label="t('children.guardianPhone')">
          <input
            :value="form.guardianPhone"
            type="tel"
            inputmode="numeric"
            pattern="[0-9\s+]*"
            maxlength="17"
            :placeholder="t('children.guardianPhonePlaceholder')"
            class="w-full h-touch-lg px-4 rounded-xl bg-surface border border-border text-base focus:border-primary-400"
            @input="onGuardianPhoneInput"
            @keydown="blockNonDigitKey"
          />
        </FormField>
        <FormField :label="t('children.healthFlag')" :hint="t('children.healthFlagHint')">
          <BaseSelect v-model="form.healthFlag" :options="healthFlagOptions" />
        </FormField>
        <p v-if="formError" class="text-sm text-danger-600">{{ formError }}</p>
      </form>
      <template #footer>
        <BaseButton variant="outline" full-width @click="showFormModal = false">{{ t('common.cancel') }}</BaseButton>
        <BaseButton variant="primary" full-width :loading="saving" @click="submitForm">
          {{ formMode === 'add' ? t('children.addChild') : t('children.saveChanges') }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Detail modal -->
    <BaseModal v-model="showDetailModal" :title="activeChild?.name || t('common.child')">
      <div v-if="activeChild" class="space-y-4">
        <div class="flex items-center gap-3">
          <div class="relative flex-shrink-0 cursor-pointer" @click="showDetailModal = false; openPhotoModal(activeChild)">
            <img
              v-if="activeChild.photoUrl"
              :src="resolveMediaUrl(activeChild.photoUrl)"
              :alt="activeChild.name"
              class="w-14 h-14 rounded-full object-cover"
            />
            <div
              v-else
              class="w-14 h-14 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-600 font-display font-semibold text-lg"
            >
              {{ initials(activeChild.name) }}
            </div>
            <span
              v-if="!activeChild.photoUrl"
              class="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-sm"
            >
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </span>
          </div>
          <div class="min-w-0">
            <p class="font-medium text-ink truncate">{{ activeChild.name }}</p>
            <p class="text-xs text-ink-soft">{{ activeChild.age ?? '—' }} {{ t('children.yrs') }} · {{ activeChild.gender === 'M' ? t('children.male') : activeChild.gender === 'F' ? t('children.female') : t('children.other') }}</p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p class="text-xs text-ink-faint">{{ t('common.guardian') }}</p>
            <p class="text-ink font-medium">{{ guardianNameOf(activeChild) }}</p>
          </div>
          <div>
            <p class="text-xs text-ink-faint">{{ t('children.guardianPhone') }}</p>
            <p class="text-ink font-medium">{{ activeChild.guardian?.phone || activeChild.guardianPhone || '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-ink-faint">{{ t('common.center') }}</p>
            <p class="text-ink font-medium">{{ centerNameOf(activeChild) }}</p>
          </div>
          <div>
            <p class="text-xs text-ink-faint">{{ t('children.healthFlag') }}</p>
            <BaseBadge v-if="activeChild.healthFlag" :tone="activeChild.healthFlag === 'high' || activeChild.healthFlag === 'critical' ? 'danger' : activeChild.healthFlag === 'medium' ? 'warning' : 'info'">
              {{ healthLabel(activeChild.healthFlag) }}
            </BaseBadge>
            <p v-else class="text-ink font-medium">{{ t('children.none') }}</p>
          </div>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="danger" @click="showDetailModal = false; openDeleteModal(activeChild)">{{ t('common.delete') }}</BaseButton>
        <BaseButton variant="primary" full-width @click="editFromDetail">{{ t('common.edit') }}</BaseButton>
      </template>
    </BaseModal>

    <!-- Photo modal (upload / capture) -->
    <BaseModal v-model="showPhotoModal" :title="`${t('children.photo')} — ${photoChild?.name || ''}`" size="sm">
      <div class="space-y-4">
        <PhotoCapture @captured="onPhotoCaptured" />
        <p class="text-xs text-ink-faint text-center">{{ t('children.photoHint') }}</p>
      </div>
      <template #footer>
        <BaseButton variant="outline" full-width @click="showPhotoModal = false">{{ t('common.cancel') }}</BaseButton>
        <BaseButton variant="primary" full-width :loading="photoSaving" :disabled="!capturedPhoto" @click="savePhoto">{{ t('children.savePhoto') }}</BaseButton>
      </template>
    </BaseModal>

    <!-- Delete confirmation modal -->
    <BaseModal v-model="showDeleteModal" :title="t('children.removeChild')" size="sm">
      <p class="text-sm text-ink-soft">
        {{ t('children.removeConfirm', { name: activeChild?.name || '' }) }}
      </p>
      <p v-if="deleteError" class="text-sm text-danger-600 mt-2">{{ deleteError }}</p>
      <template #footer>
        <BaseButton variant="outline" full-width @click="showDeleteModal = false">{{ t('common.cancel') }}</BaseButton>
        <BaseButton variant="danger" full-width :loading="deleting" @click="confirmDelete">{{ t('common.remove') }}</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
