<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  /** Ordered list of route names that should slide between each other */
  routeOrder: { type: Array, default: () => [] },
})

const router = useRouter()
const fromIdx = ref(-1)

// Watch navigation to track direction
router.afterEach((to, from) => {
  fromIdx.value = props.routeOrder.indexOf(from.name)
})

const transitionName = computed(() => {
  const toIdx = props.routeOrder.indexOf(router.currentRoute.value.name)
  if (fromIdx.value < 0 || toIdx < 0) return 'none'
  return toIdx > fromIdx.value ? 'slide-left' : 'slide-right'
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
      <transition :name="transitionName">
        <component :is="Component" :key="route.path" />
      </transition>
    </KeepAlive>
  </router-view>
</template>

<style scoped>
/* Slide left: navigating forward (e.g. Home → Children) */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
  width: 100%;
  top: 0;
  left: 0;
}
.slide-left-enter-from {
  transform: translateX(100%);
}
.slide-left-leave-to {
  transform: translateX(-100%);
}

/* Slide right: navigating backward (e.g. Children → Home) */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
  width: 100%;
  top: 0;
  left: 0;
}
.slide-right-enter-from {
  transform: translateX(-100%);
}
.slide-right-leave-to {
  transform: translateX(100%);
}

/* No animation for non-sibling navigation */
.none-enter-active,
.none-leave-active {
  transition: none;
}
</style>
