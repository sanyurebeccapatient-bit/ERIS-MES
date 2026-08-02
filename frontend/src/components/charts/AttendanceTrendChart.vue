<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js'
import EmptyState from '@/components/ui/EmptyState.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

const props = defineProps({
  labels: { type: Array, required: true },
  data: { type: Array, required: true },
  loading: { type: Boolean, default: false },
})

const hasData = computed(() => props.data && props.data.length > 0 && props.data.some(v => v > 0))

// Adjust point radius based on data density
const pointRadius = computed(() => {
  if (!props.data || props.data.length > 60) return 0
  if (props.data.length > 14) return 2
  return 4
})

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      label: 'Attendance rate',
      data: props.data,
      borderColor: '#0F6B5C',
      backgroundColor: (ctx) => {
        const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 240)
        gradient.addColorStop(0, 'rgba(15,107,92,0.22)')
        gradient.addColorStop(1, 'rgba(15,107,92,0)')
        return gradient
      },
      fill: true,
      tension: 0.35,
      pointRadius: pointRadius.value,
      pointBackgroundColor: '#0F6B5C',
      pointBorderColor: '#fff',
      pointBorderWidth: pointRadius.value > 2 ? 2 : 1,
      borderWidth: 2.5,
    },
  ],
}))

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1C2321',
      padding: 10,
      cornerRadius: 8,
      titleFont: { family: 'Inter' },
      bodyFont: { family: 'Inter' },
      callbacks: { label: (ctx) => `${ctx.parsed.y}% attendance` },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#7C8580', font: { family: 'Inter', size: 12 } } },
    y: {
      min: 0,
      max: 100,
      grid: { color: '#E4DFD5' },
      ticks: { color: '#7C8580', font: { family: 'Inter', size: 12 }, callback: (v) => `${v}%` },
    },
  },
}
</script>

<template>
  <div class="h-60">
    <div v-if="loading" class="h-full flex items-center justify-center">
      <div class="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
    <EmptyState v-else-if="!hasData" title="No attendance data" message="No attendance records found for this range." class="!py-8" />
    <Line v-else :data="chartData" :options="options" />
  </div>
</template>
