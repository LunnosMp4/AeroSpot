import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Coordinates, HomeLocation } from '@/types'
import { STORAGE_KEYS, readJSON, removeJSON, writeJSON } from '@/services/storage'
import { reverseGeocode } from '@/services/api/ban'
import { formatCoordinates } from '@/utils/format'

export const useHomeStore = defineStore('home', () => {
  const home = ref<HomeLocation | null>(readJSON<HomeLocation | null>(STORAGE_KEYS.home, null))

  const hasHome = computed(() => home.value !== null)
  const coordinates = computed<Coordinates | null>(() => home.value?.coordinates ?? null)
  const label = computed(() => home.value?.label ?? '')

  function persist(): void {
    if (home.value) writeJSON<HomeLocation>(STORAGE_KEYS.home, home.value)
    else removeJSON(STORAGE_KEYS.home)
  }

  function setHome(location: HomeLocation): void {
    home.value = location
    persist()
  }

  async function setHomeAtCoordinates(coordinates: Coordinates): Promise<HomeLocation> {
    let label = formatCoordinates(coordinates)
    let postcode: string | undefined
    let citycode: string | undefined
    let context: string | undefined

    try {
      const address = await reverseGeocode(coordinates)
      if (address) {
        label = address.label
        postcode = address.postcode
        citycode = address.citycode
        context = address.context
      }
    } catch {
      /* reverse geocoding is best-effort */
    }

    const location: HomeLocation = {
      coordinates,
      label,
      postcode,
      citycode,
      context,
      setAt: new Date().toISOString(),
    }
    setHome(location)
    return location
  }

  function clearHome(): void {
    home.value = null
    persist()
  }

  return { home, hasHome, coordinates, label, setHome, setHomeAtCoordinates, clearHome }
})
