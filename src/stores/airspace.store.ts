import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Coordinates, LegalityResult, Spot } from '@/types'
import { getRestrictionsInBBox, inspectLegality } from '@/services/api/ignAirspace'
import { getCachedLegality, setCachedLegality } from '@/services/legalityCache'
import { resolveLegality } from '@/services/regulation'
import { pointInMultiPolygon } from '@/utils/geo'

const CONCURRENCY = 3
const TILE_SIZE = 0.4
const TILE_LIMIT = 1000

interface Tile {
  bbox: [number, number, number, number]
  spots: Spot[]
}

function tileKey(coordinates: Coordinates): string {
  return `${Math.floor(coordinates.lng / TILE_SIZE)}:${Math.floor(coordinates.lat / TILE_SIZE)}`
}

function tileFor(coordinates: Coordinates): Tile {
  const x = Math.floor(coordinates.lng / TILE_SIZE)
  const y = Math.floor(coordinates.lat / TILE_SIZE)
  return {
    bbox: [x * TILE_SIZE, y * TILE_SIZE, (x + 1) * TILE_SIZE, (y + 1) * TILE_SIZE],
    spots: [],
  }
}

export const useAirspaceStore = defineStore('airspace', () => {
  const inspected = ref<LegalityResult | null>(null)
  const inspectLoading = ref(false)
  const inspectError = ref<string | null>(null)

  const bySpotId = ref<Record<string, LegalityResult>>({})
  const legalityLoading = ref(false)

  async function inspectPoint(coordinates: Coordinates): Promise<void> {
    inspectLoading.value = true
    inspectError.value = null
    try {
      inspected.value = await inspectLegality(coordinates)
    } catch (error) {
      inspectError.value =
        error instanceof Error ? error.message : 'Impossible de vérifier cette zone.'
      inspected.value = null
    } finally {
      inspectLoading.value = false
    }
  }

  function clearInspection(): void {
    inspected.value = null
    inspectError.value = null
  }

  async function resolveSpot(spot: Spot, next: Record<string, LegalityResult>, signal?: AbortSignal) {
    try {
      const result = await inspectLegality(spot.coordinates, signal)
      next[spot.id] = result
      setCachedLegality(spot.coordinates, result)
    } catch {
      /* leave unresolved */
    }
  }

  /**
   * Resolve legality for many spots with one WFS request per ~44 km tile
   * (point-in-polygon tested locally), falling back to precise per-spot queries
   * when a tile is saturated. Cached results are reused.
   */
  async function resolveForSpots(spots: Spot[], signal?: AbortSignal): Promise<void> {
    if (spots.length === 0) {
      bySpotId.value = {}
      return
    }

    legalityLoading.value = true
    const next: Record<string, LegalityResult> = { ...bySpotId.value }

    const tiles = new Map<string, Tile>()
    for (const spot of spots) {
      const cached = getCachedLegality(spot.coordinates)
      if (cached) {
        next[spot.id] = cached
        continue
      }
      const key = tileKey(spot.coordinates)
      const tile = tiles.get(key) ?? tileFor(spot.coordinates)
      tile.spots.push(spot)
      tiles.set(key, tile)
    }

    const queue = [...tiles.values()]

    const worker = async (): Promise<void> => {
      while (queue.length > 0) {
        if (signal?.aborted) return
        const tile = queue.shift()
        if (!tile) return

        let found
        try {
          found = await getRestrictionsInBBox(tile.bbox, signal, TILE_LIMIT)
        } catch {
          continue
        }

        if (found.length >= TILE_LIMIT) {
          // Tile saturated — fall back to precise per-spot checks.
          for (const spot of tile.spots) {
            if (signal?.aborted) return
            await resolveSpot(spot, next, signal)
          }
          continue
        }

        for (const spot of tile.spots) {
          const hits = found.filter(
            (restriction) =>
              restriction.geometry != null &&
              pointInMultiPolygon(restriction.geometry.coordinates, spot.coordinates),
          )
          const { maxAltitudeM, status } = resolveLegality(hits)
          const result: LegalityResult = {
            coordinates: spot.coordinates,
            maxAltitudeM,
            status,
            restrictions: hits,
            checkedAt: new Date().toISOString(),
            source: 'wfs',
          }
          next[spot.id] = result
          setCachedLegality(spot.coordinates, result)
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tiles.size) }, worker))
    bySpotId.value = next
    legalityLoading.value = false
  }

  function legalityFor(spotId: string): LegalityResult | null {
    return bySpotId.value[spotId] ?? null
  }

  return {
    inspected,
    inspectLoading,
    inspectError,
    bySpotId,
    legalityLoading,
    inspectPoint,
    clearInspection,
    resolveForSpots,
    legalityFor,
  }
})
