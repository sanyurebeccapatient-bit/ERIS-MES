import { ref } from 'vue'

export function useGeolocation() {
  const coords = ref(null) // { latitude, longitude, accuracy, timestamp }
  const status = ref('idle') // idle | locating | success | error
  const errorMessage = ref('')

  function capture() {
    if (!('geolocation' in navigator)) {
      status.value = 'error'
      errorMessage.value = 'Location services are not available on this device.'
      return
    }
    status.value = 'locating'
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coords.value = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date().toISOString(),
        }
        status.value = 'success'
      },
      (err) => {
        status.value = 'error'
        errorMessage.value =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. Enable it in your device settings.'
            : 'Could not get your location. Try again.'
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  return { coords, status, errorMessage, capture }
}
