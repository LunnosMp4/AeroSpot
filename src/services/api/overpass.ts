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

/** FPV-oriented candidate selectors (abandoned/industrial/track sites). */
const FPV_SELECTORS = [
  'nwr["building"="abandoned"]',
  'nwr["historic"="ruins"]',
  'nwr["landuse"="industrial"]["abandoned"="yes"]',
  'nwr["man_made"="works"]["abandoned"="yes"]',
  'nwr["disused:amenity"]',
  'nwr["leisure"="track"]',
  'nwr["sport"="motocross"]',
]

/** OpenStreetMap free-flying sites (paragliding / hang-gliding take-off & landing). */
const PARAGLIDING_SELECTORS = [
  'nwr["sport"="free_flying"]',
  'nwr["sport"="paragliding"]',
  'nwr["sport"="hang_gliding"]',
  'nwr["free_flying:site"]',
  'nwr["free_flying:paragliding"="yes"]',
]

const SELECTORS = [...FPV_SELECTORS, ...PARAGLIDING_SELECTORS]

function aroundScope(center: Coordinates, radiusKm: number): string {
  return `(around:${Math.round(radiusKm * 1000)},${center.lat},${center.lng})`
}

function buildQuery(scope: string, limit: number): string {
  const body = SELECTORS.map((selector) => `${selector}${scope};`).join('\n  ')
  return `[out:json][timeout:25];\n(\n  ${body}\n);\nout center ${limit};`
}

function isFreeFlying(tags: Record<string, string>): boolean {
  const sports = (tags.sport ?? '').split(';').map((value) => value.trim())
  return (
    sports.includes('free_flying') ||
    sports.includes('paragliding') ||
    sports.includes('hang_gliding') ||
    tags['free_flying:site'] != null ||
    tags['free_flying:paragliding'] === 'yes'
  )
}

function categorize(name: string, tags: Record<string, string>): SpotCategory {
  // Only the generic, unnamed "Ruines" fallback is split out; named ruins stay bando.
  if (name === 'Ruines') return 'ruins'
  if (isFreeFlying(tags)) return 'paragliding'
  if (tags.sport === 'motocross' || tags.leisure === 'track') return 'race'
  return 'bando'
}

function defaultName(tags: Record<string, string>): string {
  if (tags.name) return tags.name
  if (isFreeFlying(tags)) {
    const site = tags['free_flying:site']
    if (site === 'takeoff') return 'Décollage parapente'
    if (site === 'landing') return 'Atterrissage parapente'
    if (site === 'towing') return 'Site de treuil'
    if (site === 'training') return 'Pente école parapente'
    return 'Site de parapente'
  }
  if (tags.historic === 'ruins') return 'Ruines'
  if (tags.building === 'abandoned') return 'Bâtiment abandonné'
  if (tags['disused:amenity']) return `Ancien ${tags['disused:amenity']}`
  if (tags.sport === 'motocross') return 'Terrain de motocross'
  if (tags.leisure === 'track') return 'Piste'
  if (tags.man_made === 'works') return 'Site industriel abandonné'
  return 'Site industriel'
}

const TAG_KEYS = [
  'abandoned',
  'building',
  'historic',
  'landuse',
  'man_made',
  'leisure',
  'sport',
]

function deriveTags(tags: Record<string, string>): string[] {
  const collected = ['osm']
  if (isFreeFlying(tags)) {
    collected.push('parapente')
    const site = tags['free_flying:site']
    if (site === 'takeoff') collected.push('décollage')
    else if (site === 'landing') collected.push('atterrissage')
    else if (site) collected.push(site)
  } else {
    for (const key of TAG_KEYS) {
      const value = tags[key]
      if (value) collected.push(value)
    }
  }
  return [...new Set(collected)].slice(0, 5)
}

function toSpot(element: OverpassElement): Spot | null {
  const lat = element.lat ?? element.center?.lat
  const lng = element.lon ?? element.center?.lon
  if (lat == null || lng == null) return null

  const tags = element.tags ?? {}
  const name = defaultName(tags)
  return {
    id: `osm-${element.type}-${element.id}`,
    name,
    description: tags.description,
    city: tags['addr:city'],
    category: categorize(name, tags),
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

async function runQuery(query: string, cacheKey: string, signal?: AbortSignal): Promise<Spot[]> {
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.spots
  }

  const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt)
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  lastRequestAt = Date.now()

  const data = await postOverpass(query, signal)
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

/** Discovers FPV candidates and paragliding sites around a centre point. */
export async function findCandidates(params: DiscoveryParams): Promise<Spot[]> {
  const limit = params.limit ?? 500
  const cacheKey = `around:${params.center.lat.toFixed(3)},${params.center.lng.toFixed(3)},${params.radiusKm},${limit}`
  return runQuery(
    buildQuery(aroundScope(params.center, params.radiusKm), limit),
    cacheKey,
    params.signal,
  )
}
