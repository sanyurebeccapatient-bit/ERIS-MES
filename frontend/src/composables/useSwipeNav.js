import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'

/**
 * WhatsApp-style horizontal swipe navigation between sibling routes.
 * Swipe right → previous page, swipe left → next page.
 * Only activates on horizontal swipes (not vertical scrolling).
 * Skips swipe when the gesture starts inside a horizontally scrollable
 * container (filter pills, etc.) so the user can scroll those freely.
 *
 * @param {Array} routeList - ordered list of sibling route names.
 * @param {import('vue').Ref} [containerEl] - optional ref to the DOM node
 *   that should follow the finger in real time (the sliding page content,
 *   never the top bar). When provided, dragging is applied directly via
 *   inline style transforms (no reactive re-render per pixel) for smooth,
 *   high-performance 1:1 tracking, then either commits to the next route
 *   or snaps back on release — the same feel as WhatsApp's tab paging.
 */
export function useSwipeNav(routeList, containerEl) {
  const router = useRouter()
  const route = useRoute()
  const startX = ref(0)
  const startY = ref(0)
  const deltaX = ref(0)
  const swiping = ref(false)
  const direction = ref(null) // 'left' | 'right' | null
  let viewportWidth = 0

  function findIndex(name) {
    return routeList.findIndex((r) => (typeof r === 'string' ? r : r.name) === name)
  }

  /** Check if the touch target (or any ancestor) is a horizontal scroll container. */
  function isInsideHScroll(el) {
    let node = el
    while (node && node !== document.body) {
      const style = getComputedStyle(node)
      const overflowX = style.overflowX
      if ((overflowX === 'auto' || overflowX === 'scroll') && node.scrollWidth > node.clientWidth) {
        return true
      }
      node = node.parentElement
    }
    return false
  }

  /** Apply a live transform directly to the DOM node (bypasses Vue's reactivity for perf). */
  function paint(x, withTransition) {
    const el = containerEl && containerEl.value
    if (!el) return
    el.style.transition = withTransition ? 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
    el.style.transform = x ? `translate3d(${x}px,0,0)` : ''
  }

  function onTouchStart(e) {
    const touch = e.touches[0]
    startX.value = touch.clientX
    startY.value = touch.clientY
    deltaX.value = 0
    swiping.value = false
    direction.value = null
    viewportWidth = window.innerWidth || 375
  }

  function onTouchMove(e) {
    // If we're already tracking a swipe, don't let the browser scroll
    if (swiping.value) {
      e.preventDefault()
    }

    const touch = e.touches[0]
    deltaX.value = touch.clientX - startX.value
    const deltaY = Math.abs(touch.clientY - startY.value)

    // Only start tracking if horizontal movement exceeds vertical
    if (!swiping.value && Math.abs(deltaX.value) > 10 && Math.abs(deltaX.value) > deltaY) {
      // Don't start a page swipe if we're inside a horizontal scroller
      if (isInsideHScroll(e.target)) return
      swiping.value = true
    }

    if (swiping.value) {
      direction.value = deltaX.value > 0 ? 'right' : 'left'

      // Don't let the drag go past the edge when there's no sibling to reveal
      const currentIdx = findIndex(route.name)
      const hasNext = currentIdx !== -1 && !!routeList[currentIdx + 1]
      const hasPrev = currentIdx !== -1 && !!routeList[currentIdx - 1]
      let x = deltaX.value
      if (x < 0 && !hasNext) x = 0
      if (x > 0 && !hasPrev) x = 0

      // Directly paint the page content — real-time 1:1 finger tracking,
      // top bar and bottom nav are outside this container so they stay put.
      paint(x, false)
    }
  }

  function onTouchEnd() {
    if (!swiping.value) {
      return
    }
    const threshold = 80
    const currentIdx = findIndex(route.name)

    if (currentIdx === -1) {
      paint(0, true)
      swiping.value = false
      direction.value = null
      deltaX.value = 0
      return
    }

    let targetName = null
    if (direction.value === 'left' && deltaX.value < -threshold) {
      const next = routeList[currentIdx + 1]
      if (next) targetName = typeof next === 'string' ? next : next.name
    } else if (direction.value === 'right' && deltaX.value > threshold) {
      const prev = routeList[currentIdx - 1]
      if (prev) targetName = typeof prev === 'string' ? prev : prev.name
    }

    if (targetName) {
      // Commit: finish sliding the current page off-screen, then swap routes.
      const offscreen = direction.value === 'left' ? -viewportWidth : viewportWidth
      paint(offscreen, true)
      const el = containerEl && containerEl.value
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        router.push({ name: targetName })
        // Reset instantly (no transition) so the new page's own enter
        // animation takes over cleanly with no leftover offset.
        requestAnimationFrame(() => paint(0, false))
      }
      if (el) {
        el.addEventListener('transitionend', finish, { once: true })
        // Safety net in case transitionend doesn't fire (e.g. 0-distance edge case)
        setTimeout(finish, 260)
      } else {
        finish()
      }
    } else {
      // Snap back — threshold not met.
      paint(0, true)
    }

    swiping.value = false
    direction.value = null
    deltaX.value = 0
  }

  onMounted(() => {
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
  })

  onBeforeUnmount(() => {
    document.removeEventListener('touchstart', onTouchStart)
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', onTouchEnd)
  })

  return { swiping, direction, deltaX }
}
