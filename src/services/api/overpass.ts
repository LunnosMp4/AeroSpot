import type { Coordinates, Spot, SpotCategory } from '@/types'
import { CONFIG } from '@/services/config'
import { HttpError, postForm } from './http'

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

interface OverpassResponse {
  elements: OverpassElement[]
}

export interface DiscoveryParams {
  center: Coordinates
  radiusKm: number
  limit?: number
  signal?: AbortSignal
}

function buildQuery(center: Coordinates, radiusKm: number, limit: number): string {
  const around = `(around:${Math.round(radiusKm * 1000)},${center.lat},${center.lng})`
  return `[out:json][timeout:25];
(
  nwr["building"="abandoned"]${around};
  nwr["historic"="ruins"]${around};
  nwr["landuse"="industrial"]["abandoned"="yes"]${around};
  nwr["man_made"="works"]["abandoned"="yes"]${around};
  nwr["disused:amenity"]${around};
  nwr["leisure"="track"]${around};
  nwr["sport"="motocross"]${around};
);
out center ${limit};`
}

function categorize(tags: Record<string, string>): SpotCategory {
  if (tags.sport === 'motocross' || tags.leisure === 'track') return 'race'
  if (tags.historic === 'ruins') return 'bando'
  if (tags.building === 'abandoned') return 'bando'
  if (tags['disused:amenity']) return 'bando'
  return 'bando'
}

function defaultName(tags: Record<string, string>): string {
  if (tags.name) return tags.name
  if (tags.historic === 'ruins') return 'Ruines'
  if (tags.building === 'abandoned') return 'Bâtiment abandonné'
  if (tags['disused:amenity']) return `Ancien ${tags['disused:amenity']}`
  if (tags.sport === 'motocross') return 'Terrain de motocross'
  if (tags.leisure === 'track') return 'Piste'
  if (tags.man_made === 'works') return 'Site industriel abandonné'
  return 'Site industriel'
}

const TAG_KEYS = ['abandoned', 'disused', 'building', 'historic', 'landuse', 'man_made', 'leisure', 'sport']

function deriveTags(tags: Record<string, string>): string[] {
  const collected = ['osm']
  for (const key of TAG_KEYS) {
    const value = tags[key]
    if (value) collected.push(key === 'disused' ? 'désaffecté' : value)
  }
  return [...new Set(collected)].slice(0, 5)
}

function toSpot(element: OverpassElement): Spot | null {
  const lat = element.lat ?? element.center?.lat
  const lng = element.lon ?? element.center?.lon
  if (lat == null || lng == null) return null

  const tags = element.tags ?? {}
  return {
    id: `osm-${element.type}-${element.id}`,
    name: defaultName(tags),
    description: tags.description,
    city: tags['addr:city'],
    category: categorize(tags),
    tags: deriveTags(tags),
    coordinates: { lng, lat },
    altitudeCeilingM: null,
    legalStatus: 'unknown',
    source: 'overpass',
    createdAt: new Date().toISOString(),
  }
}

const CACHE_TTL_MS = 10 * 60 * 1000
const MIN_INTERVAL_MS = 1200
const cache = new Map<string, { at: number; spots: Spot[] }>()
let lastRequestAt = 0

async function postOverpass(query: string, signal?: AbortSignal): Promise<OverpassResponse> {
  let lastError: unknown = null
  for (const endpoint of CONFIG.overpassEndpoints) {
    try {
      return await postForm<OverpassResponse>(
        endpoint,
        { data: query },
        { signal, timeoutMs: 30_000, headers: { Accept: 'application/json' } },
      )
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') throw error
      lastError = error
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new HttpError(0, 'Service Overpass indisponible.', CONFIG.overpassEndpoints[0] ?? '')
}

export async function findFpvCandidates(params: DiscoveryParams): Promise<Spot[]> {
  const limit = params.limit ?? 500
  const cacheKey = `${params.center.lat.toFixed(3)},${params.center.lng.toFixed(3)},${params.radiusKm},${limit}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.spots
  }

  const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt)
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  lastRequestAt = Date.now()

  const query = buildQuery(params.center, params.radiusKm, limit)
  const data = await postOverpass(query, params.signal)
  const spots = (data.elements ?? [])
    .map(toSpot)
    .filter((spot): spot is Spot => spot !== null)
  const seen = new Set<string>()
  const unique = spots.filter((spot) => {
    if (seen.has(spot.id)) return false
    seen.add(spot.id)
    return true
  })
  cache.set(cacheKey, { at: Date.now(), spots: unique })
  return unique
}
