<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Track the navigation direction for the slide animation
const routeOrder = [
  'caregiver-dashboard',
  'children',
  'visits',
  'notifications',
]

const transitionName = computed(() => {
  const toIdx = routeOrder.indexOf(router.currentRoute.value.name)
  const fromIdx = router.currentRoute.value.meta?.fromIndex ?? -1
  if (fromIdx < 0 || toIdx < 0) return 'none'
  return toIdx > fromIdx ? 'slide-left' : 'slide-right'
})

// Components to keep alive (cache their data between navigations)
const keepAliveNames = [
  'caregiver-dashboard',
  'children',
  'visits',
  'notifications',
  'attendance',
  'attendance-reports',
  'profile',
  'admin-dashboard',
  'admin-caregivers',
  'admin-centers',
  'admin-reports',
  'admin-alerts',
  'admin-notifications',
  'admin-audit',
  'admin-profile',
]
</script>

<template>
  <router-view v-slot="{ Component, route }">
    <KeepAlive :include="keepAliveNames">
      <transition :name="transitionName" mode="out-in">
        <component :is="Component" :key="route.path" />
      </transition>
    </KeepAlive>
  </router-view>
</template>

<style scoped>
/* Slide left: navigating forward (e.g. Home → Children) */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.28s ease;
  position: absolute;
  width: 100%;
}
.slide-left-enter-from {
  transform: translateX(100%);
  opacity: 0.5;
}
.slide-left-leave-to {
  transform: translateX(-30%);
  opacity: 0.3;
}

/* Slide right: navigating backward (e.g. Children → Home) */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.28s ease;
  position: absolute;
  width: 100%;
}
.slide-right-enter-from {
  transform: translateX(-30%);
  opacity: 0.3;
}
.slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0.5;
}

/* No animation for non-sibling navigation */
.none-enter-active,
.none-leave-active {
  transition: none;
}
</style>
