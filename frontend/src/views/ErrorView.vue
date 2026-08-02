<script setup>
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-surface">
    <div class="w-20 h-20 rounded-full bg-surface-sunken flex items-center justify-center mb-5">
      <svg class="w-9 h-9 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h1 class="font-display font-bold text-xl text-ink mb-1.5">Page not found</h1>
    <p class="text-sm text-ink-soft max-w-xs mb-6">
      The page you're looking for doesn't exist or may have moved.
    </p>
    <BaseButton variant="primary" @click="router.replace({ name: 'caregiver-dashboard' })">
      Back to dashboard
    </BaseButton>
  </div>
</template>
