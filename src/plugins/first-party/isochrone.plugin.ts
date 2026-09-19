import type { Map as MapLibreMap } from 'maplibre-gl'
import { GeoJSONSource } from 'maplibre-gl'
import { watch } from 'vue'
import type { AeroSpotPlugin, PluginContext } from '../types'
import { MAX_DRIVE_MIN } from '@/types'
import { useFiltersStore } from '@/stores/filters.store'
import { useHomeStore } from '@/stores/home.store'
import { useSettingsStore } from '@/stores/settings.store'
import { fetchIsochrones } from '@/services/api/ignIsochrone'

const SOURCE_ID = 'aerospot-isochrone'
const FILL_LAYER = 'aerospot-isochrone-fill'
const LINE_LAYER = 'aerospot-isochrone-line'

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

export function createIsochronePlugin(): AeroSpotPlugin {
  let map: MapLibreMap | null = null
  let abort: AbortController | null = null
  let stopWatcher: (() => void) | null = null
  let debounceTimer: number | undefined

  function ensureLayers(m: MapLibreMap): void {
    if (!m.getSource(SOURCE_ID)) {
      m.addSource(SOURCE_ID, { type: 'geojson', data: EMPTY })
    }
    if (!m.getLayer(FILL_LAYER)) {
      m.addLayer({
        id: FILL_LAYER,
        type: 'fill',
        source: SOURCE_ID,
        paint: { 'fill-color': '#6d8cff', 'fill-opacity': 0.1 },
      })
    }
    if (!m.getLayer(LINE_LAYER)) {
      m.addLayer({
        id: LINE_LAYER,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': '#8299ff',
          'line-width': 1.5,
          'line-dasharray': [2, 2],
          'line-opacity': 0.7,
        },
      })
    }
  }

  function setData(m: MapLibreMap, data: GeoJSON.FeatureCollection): void {
    const source = m.getSource(SOURCE_ID)
    if (source && 'setData' in source) {
      ;(source as GeoJSONSource).setData(data)
    }
  }

  async function refresh(): Promise<void> {
    if (!map) return
    const home = useHomeStore()
    const settings = useSettingsStore()
    const filters = useFiltersStore()
    ensureLayers(map)

    if (!home.home || !settings.isLayerVisible('isochrone')) {
      setData(map, EMPTY)
      return
    }

    // The reachable area always follows the drive-time slider.
    const minutes = Math.min(MAX_DRIVE_MIN, Math.max(5, filters.criteria.maxDriveMin))

    abort?.abort()
    abort = new AbortController()
    try {
      const results = await fetchIsochrones(home.home.coordinates, [minutes], abort.signal)
      const features: GeoJSON.Feature[] = results.map((result) => ({
        type: 'Feature',
        properties: { minutes: result.minutes },
        geometry: result.geometry,
      }))
      setData(map, { type: 'FeatureCollection', features })
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') return
      console.warn('[AeroSpot] isochrone indisponible:', error)
    }
  }

  function scheduleRefresh(): void {
    if (debounceTimer) window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => void refresh(), 450)
  }

  return {
    id: 'isochrone',
    name: 'Isochrones',
    version: '1.0.0',
    description: 'Zone accessible en voiture, calée sur le curseur de temps de trajet.',
    activate(ctx: PluginContext): void {
      ctx.layers.register({
        id: 'isochrone',
        label: 'Zone accessible',
        description: 'Isochrone de temps de trajet depuis la base.',
        order: 20,
        defaultVisible: false,
        add(m: MapLibreMap) {
          map = m
          ensureLayers(m)
          void refresh()
        },
        remove(m: MapLibreMap) {
          abort?.abort()
          if (m.getLayer(FILL_LAYER)) m.removeLayer(FILL_LAYER)
          if (m.getLayer(LINE_LAYER)) m.removeLayer(LINE_LAYER)
          if (m.getSource(SOURCE_ID)) m.removeSource(SOURCE_ID)
          map = null
        },
      })

      const home = useHomeStore()
      const settings = useSettingsStore()
      const filters = useFiltersStore()
      stopWatcher = watch(
        [
          () => home.home?.coordinates.lng,
          () => home.home?.coordinates.lat,
          () => settings.isLayerVisible('isochrone'),
          () => filters.criteria.maxDriveMin,
        ],
        scheduleRefresh,
      )
    },
    deactivate(): void {
      stopWatcher?.()
      stopWatcher = null
      if (debounceTimer) window.clearTimeout(debounceTimer)
      abort?.abort()
      map = null
    },
  }
}
