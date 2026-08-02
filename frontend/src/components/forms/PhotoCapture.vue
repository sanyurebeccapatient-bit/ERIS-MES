<script setup>
import { ref, onBeforeUnmount } from 'vue'
import { useCameraCapture } from '@/composables/useCameraCapture'
import { useI18n } from '@/i18n/index.js'

const emit = defineEmits(['captured'])
const { preview, fileBlob, status, handleFile, clear } = useCameraCapture()
const { t } = useI18n()

// ---- Webcam state ----
const showWebcam = ref(false)
const webcamStream = ref(null)
const webcamVideo = ref(null)
const webcamCanvas = ref(null)

function onFileChange(e) {
  const file = e.target.files?.[0]
  handleFile(file).then(() => emit('captured', preview.value, fileBlob.value))
}

function reset() {
  clear()
  stopWebcam()
  emit('captured', null, null)
}

// ---- Webcam methods ----
async function openWebcam() {
  showWebcam.value = true
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    })
    webcamStream.value = stream
    await new Promise((resolve) => setTimeout(resolve, 100))
    if (webcamVideo.value) {
      webcamVideo.value.srcObject = stream
    }
  } catch {
    showWebcam.value = false
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = (e) => onFileChange(e)
    input.click()
  }
}

function stopWebcam() {
  showWebcam.value = false
  if (webcamStream.value) {
    webcamStream.value.getTracks().forEach((t) => t.stop())
    webcamStream.value = null
  }
}

function takePhoto() {
  if (!webcamVideo.value || !webcamCanvas.value) return
  const video = webcamVideo.value
  const canvas = webcamCanvas.value
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
  stopWebcam()
  const blob = dataUrlToBlob(dataUrl)
  if (blob) handleFile(blob).then(() => emit('captured', preview.value, fileBlob.value))
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',')
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const binary = atob(parts[1])
  const arr = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
  return new File([arr], 'webcam-photo.jpg', { type: mime })
}

onBeforeUnmount(() => stopWebcam())
</script>

<template>
  <div>
    <!-- Preview of captured photo -->
    <div v-if="preview" class="relative rounded-card overflow-hidden border border-border">
      <img :src="preview" alt="Captured photo" class="w-full h-48 object-cover" />
      <button
        class="absolute top-2 right-2 w-9 h-9 rounded-full bg-ink/60 flex items-center justify-center"
        aria-label="Remove photo"
        @click="reset"
      >
        <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Webcam preview modal -->
    <Teleport v-if="showWebcam" to="body">
      <div class="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
        <div class="fixed -inset-x-4 -inset-y-4" @click="stopWebcam" />
        <div class="relative w-full max-w-md bg-surface-raised rounded-t-2xl sm:rounded-2xl shadow-raised flex flex-col safe-area-bottom">
          <!-- Header -->
          <div class="flex items-center justify-between px-5 h-14 border-b border-border flex-shrink-0">
            <h2 class="font-display font-semibold text-ink">{{ t('common.camera') }}</h2>
            <button
              class="touch-target -mr-2 rounded-full flex items-center justify-center"
              aria-label="Close"
              @click="stopWebcam"
            >
              <svg class="w-5 h-5 text-ink-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <!-- Video preview -->
          <div class="relative bg-ink overflow-hidden">
            <video
              ref="webcamVideo"
              autoplay
              playsinline
              muted
              class="w-full h-auto max-h-[60vh] object-contain"
            />
          </div>
          <!-- Controls -->
          <div class="px-5 py-4 flex gap-3 border-t border-border flex-shrink-0">
            <button
              class="flex-1 h-touch rounded-xl border-2 border-border text-ink-soft font-semibold active:bg-surface-sunken transition-colors"
              @click="stopWebcam"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              class="flex-1 h-touch rounded-xl bg-primary-500 text-white font-semibold active:bg-primary-600 transition-colors flex items-center justify-center gap-2"
              @click="takePhoto"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {{ t('common.takePhoto') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Hidden canvas for capturing frame -->
    <canvas ref="webcamCanvas" class="hidden" />

    <!-- Buttons to open webcam or gallery -->
    <div v-if="!preview && !showWebcam" class="space-y-2">
      <button
        type="button"
        class="w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-border bg-surface cursor-pointer active:bg-surface-sunken transition-colors"
        @click="openWebcam"
      >
        <svg class="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span class="text-sm font-medium text-ink">{{ t('common.takePhoto') }}</span>
      </button>
      <label
        class="flex items-center justify-center gap-2 h-12 rounded-xl border border-border bg-surface cursor-pointer active:bg-surface-sunken transition-colors"
      >
        <svg class="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span class="text-sm font-medium text-ink">{{ t('common.chooseFromGallery') }}</span>
        <input
          type="file"
          accept="image/*"
          class="sr-only"
          @change="onFileChange"
        />
      </label>
    </div>
  </div>
</template>


