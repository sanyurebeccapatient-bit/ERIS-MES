import { ref } from 'vue'

/**
 * Handles photo capture from the device camera (via <input capture>) and
 * compresses the image client-side before it's queued for upload — important
 * on slow mobile connections. Returns a base64 data URL for local preview;
 * once a backend exists this can be swapped to upload a Blob directly.
 *
 * @param {Object} opts
 * @param {number} opts.maxWidth - Max width for compression (default 1200)
 * @param {number} opts.quality - JPEG quality 0-1 (default 0.6)
 * @param {boolean} opts.evidenceMode - If true, more aggressive compression for evidence photos
 */
export function useCameraCapture({ maxWidth = 1200, quality = 0.6, evidenceMode = false } = {}) {
  const preview = ref(null)
  const fileBlob = ref(null)
  const status = ref('idle')

  function compress(file) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const reader = new FileReader()
      reader.onload = (e) => {
        img.onload = () => {
          const origW = img.width
          const origH = img.height

          // For evidence mode: target ~800px wide, very compressed
          // For profile mode: keep aspect ratio, moderate compression
          let targetMaxW = maxWidth
          let targetQuality = quality
          if (evidenceMode) {
            targetMaxW = 800
            targetQuality = 0.5
          }

          const scale = Math.min(1, targetMaxW / origW)
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(origW * scale)
          canvas.height = Math.round(origH * scale)
          const ctx = canvas.getContext('2d')
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

          canvas.toBlob(
            (blob) => {
              if (!blob) { reject(new Error('Compression failed')); return }
              resolve({ blob, dataUrl: canvas.toDataURL('image/jpeg', targetQuality), width: canvas.width, height: canvas.height })
            },
            'image/jpeg',
            targetQuality
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
      const { blob, dataUrl, width, height } = await compress(file)
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
