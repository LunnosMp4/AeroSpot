import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Coordinates } from '@/types'

export const useMapStore = defineStore('map', () => {
  const map = shallowRef<MapLibreMap | null>(null)
  const ready = ref(false)

  function setMap(instance: MapLibreMap | null): void {
    map.value = instance
    ready.value = false
  }

  function setReady(value: boolean): void {
    ready.value = value
  }

  function flyTo(coordinates: Coordinates, zoom?: number): void {
    const instance = map.value
    if (!instance) return
    instance.flyTo({
      center: [coordinates.lng, coordinates.lat],
      zoom: zoom ?? Math.max(instance.getZoom(), 13),
      duration: 1100,
      essential: true,
    })
  }

  function fitBounds(bounds: [number, number, number, number], padding = 80): void {
    const instance = map.value
    if (!instance) return
    instance.fitBounds(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]],
      ],
      { padding, duration: 900 },
    )
  }

  function resetNorth(): void {
    map.value?.resetNorth()
  }

  return { map, ready, setMap, setReady, flyTo, fitBounds, resetNorth }
})
