import type { Coordinates } from '@/types'
import { CONFIG } from '@/services/config'
import { buildUrl, getJSON } from './http'

interface IsochroneResponse {
  point: string
  costValue: number
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
}

export interface IsochroneResult {
  minutes: number
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
}

export async function fetchIsochrone(
  coordinates: Coordinates,
  minutes: number,
  signal?: AbortSignal,
): Promise<IsochroneResult> {
  const url = buildUrl(CONFIG.ignIsochrone, '', {
    resource: 'bdtopo-valhalla',
    point: `${coordinates.lng},${coordinates.lat}`,
    costType: 'time',
    costValue: minutes * 60,
    profile: 'car',
    direction: 'departure',
    timeUnit: 'second',
    crs: 'EPSG:4326',
  })

  const data = await getJSON<IsochroneResponse>(url, { signal, timeoutMs: 20_000 })
  return { minutes, geometry: data.geometry }
}

export async function fetchIsochrones(
  coordinates: Coordinates,
  minutesList: number[],
  signal?: AbortSignal,
): Promise<IsochroneResult[]> {
  const results: IsochroneResult[] = []
  for (const minutes of [...minutesList].sort((a, b) => a - b)) {
    results.push(await fetchIsochrone(coordinates, minutes, signal))
  }
  return results
}
