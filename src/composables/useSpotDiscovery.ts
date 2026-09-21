import { computed, ref } from 'vue'
import type { Coordinates } from '@/types'
import { getPluginHost } from '@/plugins'
import { useAirspaceStore } from '@/stores/airspace.store'
import { useHomeStore } from '@/stores/home.store'
import { useMapStore } from '@/stores/map.store'
import { useSpotsStore } from '@/stores/spots.store'
import { useUiStore } from '@/stores/ui.store'

/** Search radius (km) around the current map centre. */
export const DISCOVERY_RADIUS_KM = 50

export type DiscoveryPhase = 'idle' | 'searching' | 'legality'

export function useSpotDiscovery() {
  const spotsStore = useSpotsStore()
  const airspace = useAirspaceStore()
  const home = useHomeStore()
  const mapStore = useMapStore()
  const ui = useUiStore()

  const loading = ref(false)
  const lastCount = ref(0)
  const phase = ref<DiscoveryPhase>('idle')

  /** Live step label so the user can see the search is still progressing. */
  const statusLabel = computed(() => {
    if (phase.value === 'searching') return 'Recherche OpenStreetMap…'
    if (phase.value === 'legality') {
      const p = airspace.legalityProgress
      return p ? `Vérification des zones… ${p.done}/${p.total}` : 'Vérification des zones…'
    }
    return 'Rechercher dans cette zone'
  })

  /** Regulatory progress during the "legality" phase, otherwise null. */
  const progress = computed(() =>
    phase.value === 'legality' ? airspace.legalityProgress : null,
  )

  /** Where the user is currently looking — falls back to the base when the map isn't ready. */
  function discoveryCenter(): Coordinates | null {
    const instance = mapStore.map
    if (instance) {
      const center = instance.getCenter()
      return { lng: center.lng, lat: center.lat }
    }
    return home.coordinates
  }

  async function discover(radiusKm = DISCOVERY_RADIUS_KM): Promise<void> {
    const provider = getPluginHost().spotProviders.get('overpass')
    if (!provider) {
      ui.pushToast('Module de découverte indisponible.', 'error')
      return
    }
    const origin = discoveryCenter()
    if (!origin) {
      ui.pushToast('Centrez la carte ou définissez une base.', 'error')
      return
    }

    loading.value = true
    phase.value = 'searching'
    try {
      const found = await provider.fetch({
        home: home.home,
        bbox: null,
        center: origin,
        radiusKm,
      })

      // Resolve official restrictions and drop anything inside a no-fly zone.
      if (found.length > 0) {
        phase.value = 'legality'
        await airspace.resolveForSpots(found)
      }
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
      phase.value = 'idle'
    }
  }

  function clear(): void {
    spotsStore.clearExternalSpots()
    lastCount.value = 0
    void spotsStore.computeRoutes(true)
  }

  return { discover, clear, loading, lastCount, phase, statusLabel, progress }
}
