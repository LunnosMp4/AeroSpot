import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Coordinates } from '@/types'
import { haversineKm } from '@/utils/geo'

export const MAX_MEASURE_POINTS = 2

export const useMeasureStore = defineStore('measure', () => {
  const enabled = ref(false)
  const points = ref<Coordinates[]>([])

  const distanceKm = computed(() => {
    const [a, b] = points.value
    if (!a || !b) return null
    return haversineKm(a, b)
  })

  const complete = computed(() => points.value.length >= MAX_MEASURE_POINTS)

  function addPoint(coordinates: Coordinates): void {
    points.value = complete.value ? [coordinates] : [...points.value, coordinates]
  }

  function reset(): void {
    points.value = []
  }

  function setEnabled(value: boolean): void {
    enabled.value = value
    if (!value) points.value = []
  }

  function toggle(): void {
    setEnabled(!enabled.value)
  }

  return {
    enabled,
    points,
    distanceKm,
    complete,
    addPoint,
    reset,
    setEnabled,
    toggle,
  }
})
