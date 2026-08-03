import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'

/**
 * WhatsApp-style horizontal swipe navigation between sibling routes.
 * Swipe right → previous page, swipe left → next page.
 * Only activates on horizontal swipes (not vertical scrolling).
 */
export function useSwipeNav(routeList) {
  const router = useRouter()
  const route = useRoute()
  const startX = ref(0)
  const startY = ref(0)
  const deltaX = ref(0)
  const swiping = ref(false)
  const direction = ref(null) // 'left' | 'right' | null

  function findIndex(name) {
    return routeList.findIndex((r) => (typeof r === 'string' ? r : r.name) === name)
  }

  function onTouchStart(e) {
    const touch = e.touches[0]
    startX.value = touch.clientX
    startY.value = touch.clientY
    deltaX.value = 0
    swiping.value = false
    direction.value = null
  }

  function onTouchMove(e) {
    const touch = e.touches[0]
    deltaX.value = touch.clientX - startX.value
    const deltaY = Math.abs(touch.clientY - startY.value)

    // Only start tracking if horizontal movement exceeds vertical
    if (!swiping.value && Math.abs(deltaX.value) > 10 && Math.abs(deltaX.value) > deltaY) {
      swiping.value = true
    }

    if (swiping.value) {
      direction.value = deltaX.value > 0 ? 'right' : 'left'
    }
  }

  function onTouchEnd() {
    if (!swiping.value) return
    const threshold = 80
    const currentIdx = findIndex(route.name)

    if (currentIdx === -1) return

    if (direction.value === 'left' && deltaX.value < -threshold) {
      // Swipe left → next page
      const next = routeList[currentIdx + 1]
      if (next) {
        const name = typeof next === 'string' ? next : next.name
        router.push({ name })
      }
    } else if (direction.value === 'right' && deltaX.value > threshold) {
      // Swipe right → previous page
      const prev = routeList[currentIdx - 1]
      if (prev) {
        const name = typeof prev === 'string' ? prev : prev.name
        router.push({ name })
      }
    }

    swiping.value = false
    direction.value = null
    deltaX.value = 0
  }

  onMounted(() => {
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
  })

  onBeforeUnmount(() => {
    document.removeEventListener('touchstart', onTouchStart)
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', onTouchEnd)
  })

  return { swiping, direction, deltaX }
}
