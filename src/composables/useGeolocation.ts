import { ref } from 'vue'
import type { Coordinates } from '@/types'

export function useGeolocation() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  function locate(): Promise<Coordinates | null> {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        error.value = 'Géolocalisation non prise en charge.'
        resolve(null)
        return
      }
      loading.value = true
      error.value = null
      navigator.geolocation.getCurrentPosition(
        (position) => {
          loading.value = false
          resolve({ lng: position.coords.longitude, lat: position.coords.latitude })
        },
        (geoError) => {
          loading.value = false
          error.value =
            geoError.code === geoError.PERMISSION_DENIED
              ? 'Accès à la position refusé.'
              : 'Position indisponible.'
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
      )
    })
  }

  return { locate, loading, error }
}
