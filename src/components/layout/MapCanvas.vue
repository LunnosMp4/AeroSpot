<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Map as MapLibreMap, type MapMouseEvent } from 'maplibre-gl'
import type { Coordinates } from '@/types'
import { CONFIG } from '@/services/config'
import { getPluginHost } from '@/plugins'
import { applyBasemap, buildStyle } from '@/services/map/mapProvider'
import {
  addHomeLayers,
  addInspectLayer,
  addPositionLayers,
  addSpotLayers,
  raiseOverlayLayers,
  SPOT_HIT_LAYER,
  SPOT_LAYER,
  setHomeData,
  setInspectData,
  setPositionData,
  setSpotsData,
} from '@/services/map/layers'
import { useAirspaceStore } from '@/stores/airspace.store'
import { useHomeStore } from '@/stores/home.store'
import { useMapStore } from '@/stores/map.store'
import { usePositionStore } from '@/stores/position.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useSpotsStore } from '@/stores/spots.store'
import { useUiStore } from '@/stores/ui.store'

const emit = defineEmits<{ (e: 'pick-coordinates', coordinates: Coordinates): void }>()

const mapStore = useMapStore()
const settings = useSettingsStore()
const spotsStore = useSpotsStore()
const homeStore = useHomeStore()
const airspace = useAirspaceStore()
const ui = useUiStore()
const positionStore = usePositionStore()

const container = ref<HTMLDivElement | null>(null)
let map: MapLibreMap | null = null
let touchCanvas: HTMLCanvasElement | null = null
const mountedLayers = new Set<string>()

function syncPluginLayers(): void {
  if (!map || !mapStore.ready) return
  const host = getPluginHost()
  const defs = host.layers.all().sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
  for (const def of defs) {
    const visible = settings.isLayerVisible(def.id, def.defaultVisible ?? true)
    const isMounted = mountedLayers.has(def.id)
    if (visible && !isMounted) {
      try {
        def.add(map)
        mountedLayers.add(def.id)
      } catch (error) {
        console.warn(`[AeroSpot] couche "${def.id}" indisponible:`, error)
      }
    } else if (!visible && isMounted) {
      try {
        def.remove(map)
      } catch (error) {
        console.warn(`[AeroSpot] retrait "${def.id}":`, error)
      }
      mountedLayers.delete(def.id)
    }
  }
  raiseOverlayLayers(map)
}

function applySpotData(): void {
  if (!map) return
  setSpotsData(map, spotsStore.visibleSpots, ui.selectedSpotId)
}

function applyHomeData(): void {
  if (!map) return
  setHomeData(map, homeStore.home?.coordinates ?? null)
}

function applyInspectData(): void {
  if (!map) return
  const result = airspace.inspected
  setInspectData(map, result?.coordinates ?? null, result?.status ?? 'unknown')
}

function applyPositionData(): void {
  if (!map) return
  setPositionData(map, positionStore.position)
}

function handleStyleReady(): void {
  if (!map) return
  mapStore.setReady(true)
  mountedLayers.clear()

  addSpotLayers(map)
  addHomeLayers(map)
  addInspectLayer(map)
  addPositionLayers(map)
  syncPluginLayers()

  applySpotData()
  applyHomeData()
  applyInspectData()
  applyPositionData()
}

function updateCursor(): void {
  if (!map) return
  map.getCanvas().style.cursor = ui.addSpotMode || ui.inspectorEnabled ? 'crosshair' : ''
}

function onMapClick(event: MapMouseEvent): void {
  if (!map) return
  if (longPressFired) {
    longPressFired = false
    return
  }
  const coordinates: Coordinates = { lng: event.lngLat.lng, lat: event.lngLat.lat }

  if (ui.addSpotMode) {
    emit('pick-coordinates', coordinates)
    return
  }

  const hit = map.queryRenderedFeatures(event.point, {
    layers: [SPOT_HIT_LAYER, SPOT_LAYER].filter((layer) => map?.getLayer(layer)),
  })
  if (hit.length > 0) {
    const id = hit[0].properties?.id as string | undefined
    if (id) {
      ui.selectSpot(id)
      return
    }
  }

  if (ui.inspectorEnabled) {
    void airspace.inspectPoint(coordinates)
  }
}

let longPressTimer: number | undefined
let pressOrigin: { x: number; y: number } | null = null
let longPressFired = false
const LONG_PRESS_MS = 500
const LONG_PRESS_SLOP_PX = 12

function clearLongPress(): void {
  if (longPressTimer !== undefined) {
    window.clearTimeout(longPressTimer)
    longPressTimer = undefined
  }
}

function onTouchStart(event: TouchEvent): void {
  clearLongPress()
  if (event.touches.length !== 1) {
    pressOrigin = null
    return
  }
  const touch = event.touches[0]
  pressOrigin = { x: touch.clientX, y: touch.clientY }
  longPressFired = false
  longPressTimer = window.setTimeout(() => {
    if (!map || !pressOrigin) return
    longPressFired = true
    const rect = map.getCanvas().getBoundingClientRect()
    const lngLat = map.unproject([pressOrigin.x - rect.left, pressOrigin.y - rect.top])
    void homeStore
      .setHomeAtCoordinates({ lng: lngLat.lng, lat: lngLat.lat })
      .then(() => ui.pushToast('Base définie à cette position.', 'success'))
  }, LONG_PRESS_MS)
}

function onTouchMove(event: TouchEvent): void {
  if (!pressOrigin || event.touches.length !== 1) {
    clearLongPress()
    return
  }
  const touch = event.touches[0]
  if (
    Math.abs(touch.clientX - pressOrigin.x) > LONG_PRESS_SLOP_PX ||
    Math.abs(touch.clientY - pressOrigin.y) > LONG_PRESS_SLOP_PX
  ) {
    clearLongPress()
    pressOrigin = null
  }
}

function onTouchEnd(): void {
  clearLongPress()
  pressOrigin = null
}

function onContextMenu(event: MapMouseEvent): void {
  event.preventDefault()
  // Touch long-press already handles this on mobile.
  if (longPressFired) return
  const coordinates: Coordinates = { lng: event.lngLat.lng, lat: event.lngLat.lat }
  void homeStore.setHomeAtCoordinates(coordinates).then(() => {
    ui.pushToast('Base définie à cette position.', 'success')
  })
}

onMounted(() => {
  if (!container.value) return

  map = new MapLibreMap({
    container: container.value,
    style: buildStyle(settings.basemap),
    center: [CONFIG.defaultCenter.lng, CONFIG.defaultCenter.lat],
    zoom: CONFIG.defaultZoom,
    attributionControl: { compact: true },
    maxPitch: 60,
  })

  mapStore.setMap(map)
  getPluginHost().setMap(map)

  if (import.meta.env.DEV) {
    ;(window as unknown as { __aerospotMap?: MapLibreMap }).__aerospotMap = map
  }

  map.on('load', handleStyleReady)
  map.on('style.load', handleStyleReady)
  map.on('error', (event) => {
    console.warn('[AeroSpot] map error:', event.error?.message ?? event)
  })
  map.on('click', onMapClick)
  map.on('contextmenu', onContextMenu)
  map.on('mouseenter', SPOT_LAYER, () => {
    if (map && !ui.addSpotMode && !ui.inspectorEnabled) map.getCanvas().style.cursor = 'pointer'
  })
  map.on('mouseleave', SPOT_LAYER, updateCursor)

  touchCanvas = map.getCanvas()
  touchCanvas.addEventListener('touchstart', onTouchStart, { passive: true })
  touchCanvas.addEventListener('touchmove', onTouchMove, { passive: true })
  touchCanvas.addEventListener('touchend', onTouchEnd)
  touchCanvas.addEventListener('touchcancel', onTouchEnd)

  watch(
    () => settings.basemap,
    (key) => {
      if (map) applyBasemap(map, key)
    },
  )
  watch(() => settings.layerVisibility, syncPluginLayers, { deep: true })
  watch([() => spotsStore.visibleSpots, () => ui.selectedSpotId], applySpotData)
  watch(() => homeStore.home?.coordinates, applyHomeData)
  watch(() => airspace.inspected, applyInspectData)
  watch(() => positionStore.position, applyPositionData)
  watch([() => ui.addSpotMode, () => ui.inspectorEnabled], updateCursor)
})

onBeforeUnmount(() => {
  if (touchCanvas) {
    touchCanvas.removeEventListener('touchstart', onTouchStart)
    touchCanvas.removeEventListener('touchmove', onTouchMove)
    touchCanvas.removeEventListener('touchend', onTouchEnd)
    touchCanvas.removeEventListener('touchcancel', onTouchEnd)
    touchCanvas = null
  }
  clearLongPress()
  map?.remove()
  map = null
  mapStore.setMap(null)
  getPluginHost().setMap(null)
})
</script>

<template>
  <div ref="container" class="h-full w-full" />
</template>
