<script setup>
import { ref, computed } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  role: { type: String, default: 'caregiver' }, // 'admin' | 'caregiver'
  title: { type: String, default: '' },
  supportPhone: { type: String, default: '+250 788 000 000' },
  supportEmail: { type: String, default: 'support@ecdconnect.rw' },
})
const emit = defineEmits(['update:modelValue'])

const modalTitle = computed(() => props.title || 'Help & support')

const adminTopics = [
  {
    q: 'Managing centers and caregivers',
    a: 'Go to Manage centers or Caregivers from your dashboard to add, edit, or deactivate centers and caregiver accounts. Changes apply immediately across the platform.',
  },
  {
    q: 'Reviewing reports and audit logs',
    a: 'Use Reports to review attendance, visits, and health submissions across centers. The Audit log tracks every change made by staff for accountability.',
  },
  {
    q: 'Health alerts',
    a: 'Health alerts are automatically generated from caregiver submissions. Open Health alerts to review, follow up, and mark items as resolved.',
  },
  {
    q: 'Resetting a caregiver PIN',
    a: 'If a caregiver forgets their PIN, they can request a reset from the login screen. You will see the request under Caregivers, where you can issue a new PIN.',
  },
  {
    q: 'Notifications',
    a: 'Admin notifications alert you to pending reset requests, new health alerts, and center activity that needs your attention.',
  },
]

const caregiverTopics = [
  {
    q: 'Submitting a quick report',
    a: 'Tap Quick report on your dashboard to log attendance, a home visit, or a health note in a few steps. Reports save automatically, even offline.',
  },
  {
    q: 'Working offline',
    a: 'You can keep recording attendance and visits without internet. Everything is saved on your device and syncs automatically once you are back online.',
  },
  {
    q: 'Tracking visits',
    a: 'Open Visits to see upcoming and completed home visits for the children assigned to you, along with visit notes.',
  },
  {
    q: 'Forgot your PIN?',
    a: 'On the login screen, tap Forgot PIN to send a reset request to your center admin. You will be able to sign in again once they reset it.',
  },
  {
    q: 'Updating your profile',
    a: 'Open Profile to update your name, phone number, photo, and app language at any time.',
  },
]

const topics = computed(() => (props.role === 'admin' ? adminTopics : caregiverTopics))
const expanded = ref(null)

function toggle(i) {
  expanded.value = expanded.value === i ? null : i
}

function close() {
  emit('update:modelValue', false)
}

function callSupport() {
  window.location.href = `tel:${props.supportPhone.replace(/\s+/g, '')}`
}

function emailSupport() {
  window.location.href = `mailto:${props.supportEmail}`
}
</script>

<template>
  <BaseModal :model-value="modelValue" :title="modalTitle" size="md" @update:model-value="(v) => emit('update:modelValue', v)">
    <div class="space-y-5">
      <p class="text-sm text-ink-soft">
        Find answers to common questions below, or reach out to our support team directly.
      </p>

      <!-- FAQ list -->
      <div class="space-y-2">
        <div
          v-for="(topic, i) in topics"
          :key="i"
          class="rounded-xl border border-border overflow-hidden"
        >
          <button
            type="button"
            class="w-full flex items-center justify-between gap-3 p-3.5 text-left active:bg-surface-sunken/50"
            @click="toggle(i)"
          >
            <span class="text-sm font-medium text-ink">{{ topic.q }}</span>
            <svg
              class="w-4 h-4 text-ink-faint flex-shrink-0 transition-transform"
              :class="expanded === i ? 'rotate-180' : ''"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div v-if="expanded === i" class="px-3.5 pb-3.5">
            <p class="text-sm text-ink-soft leading-relaxed">{{ topic.a }}</p>
          </div>
        </div>
      </div>

      
    </div>
    <template #footer>
      <BaseButton variant="primary" full-width @click="close">Close</BaseButton>
    </template>
  </BaseModal>
</template>
