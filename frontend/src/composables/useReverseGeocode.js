import { ref } from 'vue'
import { db } from '@/services/offline/db'

/**
 * Reverse geocoding via Nominatim (OpenStreetMap) with IndexedDB caching.
 * Returns { district, sector, cell, village, readableAddress } or fallback.
 */
export function useReverseGeocode() {
  const address = ref(null) // { district, sector, cell, village, readableAddress }
  const loading = ref(false)

  async function reverseGeocode(latitude, longitude) {
    if (!latitude || !longitude) {
      address.value = { readableAddress: 'Unknown location' }
      return address.value
    }

    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`

    // Check IndexedDB cache first
    try {
      const cached = await db.geoCache?.get(cacheKey)
      if (cached) {
        address.value = cached
        return cached
      }
    } catch { /* table may not exist yet */ }

    loading.value = true
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ERIS-MES/1.0' },
      })
      const data = await res.json()

      const result = {
        district: data.address?.county || data.address?.state_district || '',
        sector: data.address?.city_district || data.address?.suburb || '',
        cell: data.address?.neighbourhood || data.address?.quarter || '',
        village: data.address?.village || data.address?.hamlet || '',
        readableAddress: data.display_name || 'Unknown location',
      }

      address.value = result

      // Cache in IndexedDB
      try {
        await db.geoCache?.put({ key: cacheKey, ...result })
      } catch { /* non-critical */ }

      return result
    } catch {
      const fallback = { readableAddress: 'Unknown location' }
      address.value = fallback
      return fallback
    } finally {
      loading.value = false
    }
  }

  return { address, loading, reverseGeocode }
}
