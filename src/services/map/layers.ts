import type { Map as MapLibreMap } from 'maplibre-gl'
import { GeoJSONSource } from 'maplibre-gl'
import type { Coordinates, LegalStatus, Spot } from '@/types'
import { SPOT_CATEGORY_COLORS } from '@/types'

export const SPOT_SOURCE = 'aerospot-spots'
export const SPOT_HIT_LAYER = 'aerospot-spots-hit'
export const SPOT_LAYER = 'aerospot-spots-circle'
export const SPOT_SELECTED_LAYER = 'aerospot-spots-selected'
export const SPOT_LABEL_LAYER = 'aerospot-spots-label'

export const HOME_SOURCE = 'aerospot-home'
export const HOME_RING_LAYER = 'aerospot-home-ring'
export const HOME_LAYER = 'aerospot-home-circle'

export const INSPECT_SOURCE = 'aerospot-inspect'
export const INSPECT_LAYER = 'aerospot-inspect-circle'

export const POSITION_SOURCE = 'aerospot-position'
export const POSITION_HALO_LAYER = 'aerospot-position-halo'
export const POSITION_LAYER = 'aerospot-position-dot'

export const HOME_ICON_ID = 'aerospot-home-icon'

export interface SpotFeatureProps {
  id: string
  name: string
  color: string
  selected: boolean
}

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

export const STATUS_COLORS: Record<LegalStatus, string> = {
  clear: '#22c55e',
  limited: '#f59e0b',
  prohibited: '#ef4444',
  unknown: '#8a8a97',
}

type Point = GeoJSON.Feature<GeoJSON.Point, Record<string, unknown>>

function setSourceData(
  map: MapLibreMap,
  sourceId: string,
  data: GeoJSON.FeatureCollection,
): void {
  const source = map.getSource(sourceId)
  if (source && 'setData' in source) {
    ;(source as GeoJSONSource).setData(data)
  }
}

export function addSpotLayers(map: MapLibreMap): void {

  if (!map.getSource(SPOT_SOURCE)) {
    map.addSource(SPOT_SOURCE, { type: 'geojson', data: EMPTY })
  }
  if (!map.getLayer(SPOT_HIT_LAYER)) {
    map.addLayer({
      id: SPOT_HIT_LAYER,
      type: 'circle',
      source: SPOT_SOURCE,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 12, 9, 18, 14, 24],
        'circle-color': '#000000',
        'circle-opacity': 0,
      },
    })
  }
  if (!map.getLayer(SPOT_LAYER)) {
    map.addLayer({
      id: SPOT_LAYER,
      type: 'circle',
      source: SPOT_SOURCE,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 3.5, 9, 6, 14, 9],
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#08080a',
        'circle-opacity': 0.96,
      },
    })
  }
  if (!map.getLayer(SPOT_SELECTED_LAYER)) {
    map.addLayer({
      id: SPOT_SELECTED_LAYER,
      type: 'circle',
      source: SPOT_SOURCE,
      filter: ['==', ['get', 'selected'], true],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 10, 14, 18],
        'circle-color': 'rgba(0,0,0,0)',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.9,
      },
    })
  }
  if (!map.getLayer(SPOT_LABEL_LAYER)) {
    map.addLayer({
      id: SPOT_LABEL_LAYER,
      type: 'symbol',
      source: SPOT_SOURCE,
      minzoom: 10,
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 11,
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
        'text-font': ['Open Sans Regular'],
        'text-allow-overlap': false,
        'text-optional': true,
      },
      paint: {
        'text-color': '#edeef3',
        'text-halo-color': '#08080a',
        'text-halo-width': 1.4,
      },
    })
  }
}

export function setSpotsData(map: MapLibreMap, spots: Spot[], selectedId: string | null): void {
  if (!map.getSource(SPOT_SOURCE)) return
  const features: Point[] = spots.map((spot) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [spot.coordinates.lng, spot.coordinates.lat] },
    properties: {
      id: spot.id,
      name: spot.name,
      color: SPOT_CATEGORY_COLORS[spot.category],
      selected: spot.id === selectedId,
    },
  }))
  setSourceData(map, SPOT_SOURCE, { type: 'FeatureCollection', features })
}

interface IconImage {
  width: number
  height: number
  data: Uint8ClampedArray
}

/** Draws a small house glyph (blue body + white outline) used for the home marker. */
function createHouseIcon(): IconImage {
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, size, size)
    ctx.beginPath()
    ctx.moveTo(16, 2)
    ctx.lineTo(30, 14)
    ctx.lineTo(30, 28)
    ctx.lineTo(2, 28)
    ctx.lineTo(2, 14)
    ctx.closePath()
    ctx.fillStyle = '#6d8cff'
    ctx.fill()
    ctx.lineWidth = 2.5
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(13, 20, 6, 8)
  }
  const imageData = (ctx ?? canvas.getContext('2d'))!.getImageData(0, 0, size, size)
  return { width: size, height: size, data: imageData.data }
}

export function addHomeLayers(map: MapLibreMap): void {

  if (!map.hasImage(HOME_ICON_ID)) {
    map.addImage(HOME_ICON_ID, createHouseIcon(), { pixelRatio: 2 })
  }

  if (!map.getSource(HOME_SOURCE)) {
    map.addSource(HOME_SOURCE, { type: 'geojson', data: EMPTY })
  }
  if (!map.getLayer(HOME_RING_LAYER)) {
    map.addLayer({
      id: HOME_RING_LAYER,
      type: 'circle',
      source: HOME_SOURCE,
      paint: {
        'circle-radius': 18,
        'circle-color': 'rgba(0,0,0,0)',
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#6d8cff',
        'circle-stroke-opacity': 0.4,
      },
    })
  }
  if (!map.getLayer(HOME_LAYER)) {
    map.addLayer({
      id: HOME_LAYER,
      type: 'symbol',
      source: HOME_SOURCE,
      layout: {
        'icon-image': HOME_ICON_ID,
        'icon-size': 1.15,
        'icon-anchor': 'bottom',
        'icon-offset': [0, -3],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    })
  }
}

export function setHomeData(map: MapLibreMap, coordinates: Coordinates | null): void {
  if (!map.getSource(HOME_SOURCE)) return
  const features: GeoJSON.Feature[] = coordinates
    ? [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [coordinates.lng, coordinates.lat] },
          properties: {},
        },
      ]
    : []
  setSourceData(map, HOME_SOURCE, { type: 'FeatureCollection', features })
}

export function addInspectLayer(map: MapLibreMap): void {
  if (!map.getSource(INSPECT_SOURCE)) {
    map.addSource(INSPECT_SOURCE, { type: 'geojson', data: EMPTY })
  }
  if (!map.getLayer(INSPECT_LAYER)) {
    map.addLayer({
      id: INSPECT_LAYER,
      type: 'circle',
      source: INSPECT_SOURCE,
      paint: {
        'circle-radius': 6,
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#ffffff',
      },
    })
  }
}

export function setInspectData(
  map: MapLibreMap,
  coordinates: Coordinates | null,
  status: LegalStatus = 'unknown',
): void {
  if (!map.getSource(INSPECT_SOURCE)) return
  const features: Point[] = coordinates
    ? [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [coordinates.lng, coordinates.lat] },
          properties: { color: STATUS_COLORS[status] },
        },
      ]
    : []
  setSourceData(map, INSPECT_SOURCE, { type: 'FeatureCollection', features })
}

export function addPositionLayers(map: MapLibreMap): void {
  if (!map.getSource(POSITION_SOURCE)) {
    map.addSource(POSITION_SOURCE, { type: 'geojson', data: EMPTY })
  }
  if (!map.getLayer(POSITION_HALO_LAYER)) {
    map.addLayer({
      id: POSITION_HALO_LAYER,
      type: 'circle',
      source: POSITION_SOURCE,
      paint: {
        'circle-radius': 15,
        'circle-color': 'rgba(56, 189, 248, 0.28)',
        'circle-stroke-width': 0,
      },
    })
  }
  if (!map.getLayer(POSITION_LAYER)) {
    map.addLayer({
      id: POSITION_LAYER,
      type: 'circle',
      source: POSITION_SOURCE,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 4.5, 12, 8, 16, 11],
        'circle-color': '#38bdf8',
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#ffffff',
      },
    })
  }
}

export function setPositionData(map: MapLibreMap, coordinates: Coordinates | null): void {
  if (!map.getSource(POSITION_SOURCE)) return
  const features: GeoJSON.Feature[] = coordinates
    ? [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [coordinates.lng, coordinates.lat] },
          properties: {},
        },
      ]
    : []
  setSourceData(map, POSITION_SOURCE, { type: 'FeatureCollection', features })
}

const OVERLAY_ORDER = [
  SPOT_HIT_LAYER,
  SPOT_LAYER,
  SPOT_SELECTED_LAYER,
  SPOT_LABEL_LAYER,
  HOME_RING_LAYER,
  HOME_LAYER,
  INSPECT_LAYER,
  POSITION_HALO_LAYER,
  POSITION_LAYER,
]

/** Keep markers above plugin overlays (e.g. the airspace raster). */
export function raiseOverlayLayers(map: MapLibreMap): void {
  for (const id of OVERLAY_ORDER) {
    if (!map.getLayer(id)) continue
    try {
      map.moveLayer(id)
    } catch {
      /* layer not movable yet */
    }
  }
}
