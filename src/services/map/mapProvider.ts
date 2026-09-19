import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl'
import type { BasemapKey } from '@/stores/settings.store'

interface RasterLayerConfig {
  tiles: string[]
  attribution?: string
  maxzoom?: number
}

interface BasemapConfig {
  background: string
  layers: RasterLayerConfig[]
}

const ESRI_ATTRIBUTION = 'Esri, HERE, Garmin, © OpenStreetMap contributors'

const ESRI = 'https://services.arcgisonline.com/ArcGIS/rest/services'

const BASEMAPS: Record<BasemapKey, BasemapConfig> = {
  dark: {
    background: '#0a0a0c',
    layers: [
      {
        tiles: [`${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`],
        attribution: ESRI_ATTRIBUTION,
        maxzoom: 16,
      },
      {
        tiles: [`${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`],
        maxzoom: 16,
      },
    ],
  },
  light: {
    background: '#eceae5',
    layers: [
      {
        tiles: [`${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`],
        attribution: ESRI_ATTRIBUTION,
        maxzoom: 16,
      },
      {
        tiles: [`${ESRI}/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`],
        maxzoom: 16,
      },
    ],
  },
  satellite: {
    background: '#0a0a0c',
    layers: [
      {
        tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`],
        attribution: `${ESRI_ATTRIBUTION} · Maxar`,
        maxzoom: 19,
      },
    ],
  },
}

export const BASEMAP_ORDER: BasemapKey[] = ['dark', 'light', 'satellite']

export function buildStyle(key: BasemapKey): StyleSpecification {
  const config = BASEMAPS[key] ?? BASEMAPS.dark
  const sources: StyleSpecification['sources'] = {}
  const layers: StyleSpecification['layers'] = [
    { id: 'background', type: 'background', paint: { 'background-color': config.background } },
  ]

  config.layers.forEach((layerConfig, index) => {
    const id = index === 0 ? 'basemap' : `basemap-ref-${index}`
    sources[id] = {
      type: 'raster',
      tiles: layerConfig.tiles,
      tileSize: 256,
      maxzoom: layerConfig.maxzoom ?? 19,
      ...(layerConfig.attribution ? { attribution: layerConfig.attribution } : {}),
    }
    layers.push({ id, type: 'raster', source: id })
  })

  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources,
    layers,
  }
}

export function applyBasemap(map: MapLibreMap, key: BasemapKey): void {
  map.setStyle(buildStyle(key), { diff: false })
}
