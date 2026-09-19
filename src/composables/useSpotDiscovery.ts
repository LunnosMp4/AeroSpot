import { ref } from 'vue'
import type { Coordinates } from '@/types'
import { getPluginHost } from '@/plugins'
import { useAirspaceStore } from '@/stores/airspace.store'
import { useHomeStore } from '@/stores/home.store'
import { useMapStore } from '@/stores/map.store'
import { useSpotsStore } from '@/stores/spots.store'
import { useUiStore } from '@/stores/ui.store'
import { bboxAround } from '@/utils/geo'

export function useSpotDiscovery() {
  const spotsStore = useSpotsStore()
  const airspace = useAirspaceStore()
  const home = useHomeStore()
  const mapStore = useMapStore()
  const ui = useUiStore()

  const loading = ref(false)
  const lastCount = ref(0)

  function discoveryCenter(): Coordinates | null {
    if (home.coordinates) return home.coordinates
    const instance = mapStore.map
    if (instance) {
      const center = instance.getCenter()
      return { lng: center.lng, lat: center.lat }
    }
    return null
  }

  async function discover(radiusKm = 25): Promise<void> {
    const provider = getPluginHost().spotProviders.get('overpass')
    if (!provider) {
      ui.pushToast('Module de découverte indisponible.', 'error')
      return
    }
    const origin = discoveryCenter()
    if (!origin) {
      ui.pushToast('Définissez une base ou centrez la carte.', 'error')
      return
    }

    loading.value = true
    try {
      const found = await provider.fetch({
        home: home.home,
        bbox: bboxAround(origin, 0.4, 0.3),
        center: origin,
        radiusKm,
      })

      // Resolve official restrictions and drop anything inside a no-fly zone.
      if (found.length > 0) await airspace.resolveForSpots(found)
      const legal = found.filter((spot) => airspace.bySpotId[spot.id]?.status !== 'prohibited')
      const rejected = found.length - legal.length

      spotsStore.setExternalSpots(legal)
      lastCount.value = legal.length
      if (legal.length === 0) {
        ui.pushToast(
          rejected > 0
            ? `Aucun spot légal trouvé (${rejected} en zone interdite ignorés).`
            : 'Aucun spot trouvé dans ce rayon.',
          'info',
        )
      } else {
        ui.pushToast(
          rejected > 0
            ? `${legal.length} spots légaux ajoutés · ${rejected} en zone interdite ignorés.`
            : `${legal.length} spots légaux ajoutés.`,
          'success',
        )
      }
      void spotsStore.computeRoutes(true)
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') return
      ui.pushToast(
        error instanceof Error ? error.message : 'Découverte indisponible.',
        'error',
      )
    } finally {
      loading.value = false
    }
  }

  function clear(): void {
    spotsStore.clearExternalSpots()
    lastCount.value = 0
    void spotsStore.computeRoutes(true)
  }

  return { discover, clear, loading, lastCount }
}
