import { ref } from 'vue'

/**
 * Handles photo capture from the device camera (via <input capture>) and
 * compresses the image client-side before it's queued for upload — important
 * on slow mobile connections. Returns a base64 data URL for local preview;
 * once a backend exists this can be swapped to upload a Blob directly.
 */
export function useCameraCapture({ maxWidth = 1000, quality = 0.7 } = {}) {
  const preview = ref(null)
  const fileBlob = ref(null)
  const status = ref('idle') // idle | processing | ready | error

  function compress(file) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const reader = new FileReader()
      reader.onload = (e) => {
        img.onload = () => {
          const scale = Math.min(1, maxWidth / img.width)
          const canvas = document.createElement('canvas')
          canvas.width = img.width * scale
          canvas.height = img.height * scale
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          canvas.toBlob(
            (blob) => resolve({ blob, dataUrl: canvas.toDataURL('image/jpeg', quality) }),
            'image/jpeg',
            quality
          )
        }
        img.onerror = reject
        img.src = e.target.result
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleFile(file) {
    if (!file) return
    status.value = 'processing'
    try {
      const { blob, dataUrl } = await compress(file)
      fileBlob.value = blob
      preview.value = dataUrl
      status.value = 'ready'
    } catch {
      status.value = 'error'
    }
  }

  function clear() {
    preview.value = null
    fileBlob.value = null
    status.value = 'idle'
  }

  return { preview, fileBlob, status, handleFile, clear }
}
