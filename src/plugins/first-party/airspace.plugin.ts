import type { Map as MapLibreMap } from 'maplibre-gl'
import { GeoJSONSource } from 'maplibre-gl'
import type { AeroSpotPlugin, PluginContext } from '../types'
import { CONFIG, DATASETS } from '@/services/config'
import { STATUS_COLORS } from '@/services/map/layers'
import {
  getRestrictionsInBBox,
  loadCountriesForBBox,
} from '@/services/api/airspace/openaip'

const SOURCE_ID = 'aerospot-airspace'
const LAYER_ID = 'aerospot-airspace-layer'

const WMS_TILE_URL =
  `${CONFIG.ignWms}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap` +
  `&LAYERS=${DATASETS.droneRestrictionsWmsLayer}&STYLES=normal&FORMAT=image/png` +
  `&TRANSPARENT=true&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256`

const INTL_SOURCE_ID = 'aerospot-airspace-intl'
const INTL_FILL_LAYER = 'aerospot-airspace-intl-fill'
const INTL_LINE_LAYER = 'aerospot-airspace-intl-line'

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

export function createAirspacePlugin(): AeroSpotPlugin {
  let intlMap: MapLibreMap | null = null
  let intlAbort: AbortController | null = null
  let intlDebounce: number | undefined
  let intlListening = false

  function ensureIntlLayers(map: MapLibreMap): void {
    if (!map.getSource(INTL_SOURCE_ID)) {
      map.addSource(INTL_SOURCE_ID, { type: 'geojson', data: EMPTY })
    }
    if (!map.getLayer(INTL_FILL_LAYER)) {
      map.addLayer({
        id: INTL_FILL_LAYER,
        type: 'fill',
        source: INTL_SOURCE_ID,
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.28,
        },
      })
    }
    if (!map.getLayer(INTL_LINE_LAYER)) {
      map.addLayer({
        id: INTL_LINE_LAYER,
        type: 'line',
        source: INTL_SOURCE_ID,
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1,
          'line-opacity': 0.7,
        },
      })
    }
  }

  function setIntlData(map: MapLibreMap, data: GeoJSON.FeatureCollection): void {
    const source = map.getSource(INTL_SOURCE_ID)
    if (source && 'setData' in source) {
      ;(source as GeoJSONSource).setData(data)
    }
  }

  async function refreshIntl(): Promise<void> {
    const map = intlMap
    if (!map) return
    ensureIntlLayers(map)

    const bounds = map.getBounds()
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ]

    intlAbort?.abort()
    intlAbort = new AbortController()
    try {
      await loadCountriesForBBox(bbox, intlAbort.signal)
      const restrictions = await getRestrictionsInBBox(bbox, intlAbort.signal)
      const features: GeoJSON.Feature[] = restrictions
        .filter((restriction) => restriction.geometry != null)
        .map((restriction) => ({
          type: 'Feature',
          geometry: restriction.geometry!,
          properties: {
            name: restriction.limite,
            color: STATUS_COLORS[restriction.status],
          },
        }))
      setIntlData(map, { type: 'FeatureCollection', features })
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') return
      console.warn('[AeroSpot] espace aérien international indisponible:', error)
    }
  }

  function scheduleIntlRefresh(): void {
    if (intlDebounce) window.clearTimeout(intlDebounce)
    intlDebounce = window.setTimeout(() => void refreshIntl(), 350)
  }

  function onIntlMove(): void {
    scheduleIntlRefresh()
  }

  function attachIntl(map: MapLibreMap): void {
    if (intlListening) return
    map.on('moveend', onIntlMove)
    intlListening = true
  }

  function detachIntl(map: MapLibreMap | null): void {
    if (!intlListening) return
    map?.off('moveend', onIntlMove)
    intlListening = false
  }

  return {
    id: 'airspace',
    name: 'Restrictions DGAC + international',
    version: '1.1.0',
    description: 'Zones de restriction drone (France) et espace aérien (OpenAIP).',
    activate(ctx: PluginContext): void {
      ctx.layers.register({
        id: 'airspace',
        label: 'Restrictions drone (France)',
        description: 'Zones DGAC — catégorie ouverte et aéromodélisme.',
        order: 10,
        defaultVisible: true,
        legendUrl: DATASETS.droneLegend,
        add(map: MapLibreMap) {
          if (!map.getSource(SOURCE_ID)) {
            map.addSource(SOURCE_ID, {
              type: 'raster',
              tiles: [WMS_TILE_URL],
              tileSize: 256,
              attribution: 'DGAC · IGN Géoplateforme',
            })
          }
          if (!map.getLayer(LAYER_ID)) {
            map.addLayer({
              id: LAYER_ID,
              type: 'raster',
              source: SOURCE_ID,
              paint: { 'raster-opacity': 0.62, 'raster-fade-duration': 0 },
            })
          }
        },
        remove(map: MapLibreMap) {
          if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
          if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
        },
      })

      ctx.layers.register({
        id: 'airspace-international',
        label: 'Espace aérien (Europe)',
        description: 'Zones aériennes OpenAIP — approximation, non spécifique drones.',
        order: 12,
        defaultVisible: false,
        add(map: MapLibreMap) {
          intlMap = map
          ensureIntlLayers(map)
          attachIntl(map)
          void refreshIntl()
        },
        remove(map: MapLibreMap) {
          detachIntl(map)
          intlAbort?.abort()
          if (intlDebounce) window.clearTimeout(intlDebounce)
          if (map.getLayer(INTL_FILL_LAYER)) map.removeLayer(INTL_FILL_LAYER)
          if (map.getLayer(INTL_LINE_LAYER)) map.removeLayer(INTL_LINE_LAYER)
          if (map.getSource(INTL_SOURCE_ID)) map.removeSource(INTL_SOURCE_ID)
          intlMap = null
        },
      })
    },
    deactivate(): void {
      detachIntl(intlMap)
      intlAbort?.abort()
      if (intlDebounce) window.clearTimeout(intlDebounce)
      intlMap = null
    },
  }
}
