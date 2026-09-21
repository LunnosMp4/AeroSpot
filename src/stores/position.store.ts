import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Coordinates } from '@/types'

export const usePositionStore = defineStore('position', () => {
  const position = ref<Coordinates | null>(null)
  const accuracyM = ref<number | null>(null)

  function setPosition(coordinates: Coordinates | null, accuracy?: number): void {
    position.value = coordinates
    accuracyM.value = accuracy != null ? accuracy : null
  }

  function clearPosition(): void {
    position.value = null
    accuracyM.value = null
  }

  return { position, accuracyM, setPosition, clearPosition }
})
