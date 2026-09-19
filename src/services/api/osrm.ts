import type { Coordinates } from '@/types'
import { CONFIG } from '@/services/config'
import { buildUrl, getJSON, HttpError } from './http'

const CHUNK_SIZE = 80

export interface MatrixPoint {
  id: string
  coordinates: Coordinates
}

export interface MatrixEntry {
  id: string
  durationSec: number | null
  distanceM: number | null
}

interface OsrmTableResponse {
  code: string
  durations?: (number | null)[][]
  distances?: (number | null)[][]
  message?: string
}

function coordString(c: Coordinates): string {
  return `${c.lng},${c.lat}`
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

async function requestChunk(
  origin: Coordinates,
  points: MatrixPoint[],
  signal?: AbortSignal,
): Promise<MatrixEntry[]> {
  const coords = [origin, ...points.map((p) => p.coordinates)].map(coordString).join(';')
  const destinations = points.map((_, index) => index + 1).join(';')

  const url = buildUrl(CONFIG.osrmApi, `/table/v1/driving/${coords}`, {
    sources: '0',
    destinations,
    annotations: 'duration,distance',
  })

  const data = await getJSON<OsrmTableResponse>(url, { signal, timeoutMs: 15_000 })
  if (data.code !== 'Ok') {
    throw new HttpError(200, data.message ?? `OSRM: ${data.code}`, url)
  }

  const durations = data.durations?.[0] ?? []
  const distances = data.distances?.[0] ?? []

  return points.map((point, index) => ({
    id: point.id,
    durationSec: durations[index] ?? null,
    distanceM: distances[index] ?? null,
  }))
}

export async function computeMatrix(
  origin: Coordinates,
  points: MatrixPoint[],
  signal?: AbortSignal,
): Promise<MatrixEntry[]> {
  if (points.length === 0) return []

  const results: MatrixEntry[] = []
  for (const group of chunk(points, CHUNK_SIZE)) {
    const entries = await requestChunk(origin, group, signal)
    results.push(...entries)
  }
  return results
}
