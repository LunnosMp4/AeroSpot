import type { AirspaceRestriction, Coordinates, LegalStatus } from '@/types'
import { CONFIG } from '@/services/config'
import { getJSON } from '../http'
import { pointInMultiPolygon } from '@/utils/geo'
import { countriesIntersectingBBox, countryForPoint } from '@/services/airspace/countries'

interface OpenAipLimit {
  value?: number
  unit?: number
  referenceDatum?: number
}

interface OpenAipFeature {
  id?: number | string
  properties?: {
    _id?: string
    name?: string
    type?: number
    icaoClass?: number
    country?: string
    upperLimit?: OpenAipLimit
    lowerLimit?: OpenAipLimit
  }
  geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon
}

interface OpenAipCollection {
  type: 'FeatureCollection'
  features?: OpenAipFeature[]
}

// OpenAIP airspace `type` codes (subset we interpret).
const TYPE_PROHIBITED = 3
const TYPE_RESTRICTED = 1
const TYPE_DANGER = 2
const TYPE_CTR = 4
const TYPE_MAX_ALTITUDE = 21

const TYPE_LABELS: Record<number, string> = {
  0: 'Autre',
  1: 'Zone réglementée',
  2: 'Zone dangereuse',
  3: 'Zone interdite',
  4: 'CTR',
  7: 'TMA',
  8: 'TRA',
  9: 'TSA',
  10: 'FIR',
  12: 'ATZ',
  14: 'Couloir militaire',
  15: 'Zone d’alerte',
  16: 'Zone d’avertissement',
  17: 'Zone protégée',
  18: 'HTZ',
  19: 'Vol à voile',
  21: 'Altitude maximale',
  23: 'ASRA',
  26: 'Secteur de contrôle',
}

const countryCache = new Map<string, AirspaceRestriction[]>()
const inFlight = new Map<string, Promise<AirspaceRestriction[]>>()

function countryUrl(code: string): string {
  return `${CONFIG.openaipExports}/${code.toLowerCase()}_asp.geojson`
}

function limitToMeters(limit?: OpenAipLimit): number | null {
  if (!limit || limit.value == null || !Number.isFinite(limit.value)) return null
  const value = limit.value
  const unit = limit.unit ?? 1
  if (unit === 0) return value // meters
  if (unit === 6) return value * 30.48 // flight level ×100 ft
  return value * 0.3048 // feet
}

function toMultiPolygon(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined,
): GeoJSON.MultiPolygon | undefined {
  if (!geometry) return undefined
  if (geometry.type === 'MultiPolygon') return geometry
  return { type: 'MultiPolygon', coordinates: [geometry.coordinates] }
}

function toRestriction(feature: OpenAipFeature): AirspaceRestriction | null {
  const props = feature.properties ?? {}
  const name = props.name?.trim() || 'Zone aérienne'
  const type = props.type
  const id = props._id ?? (feature.id != null ? String(feature.id) : name)

  let status: LegalStatus = 'limited'
  let ceilingM: number | null = null

  if (type === TYPE_PROHIBITED || type === TYPE_RESTRICTED || type === TYPE_DANGER || type === TYPE_CTR) {
    status = 'prohibited'
    ceilingM = 0
  } else if (type === TYPE_MAX_ALTITUDE) {
    const ceiling = limitToMeters(props.upperLimit)
    status = ceiling != null && ceiling <= 0 ? 'prohibited' : 'limited'
    ceilingM = ceiling
  } else {
    status = 'limited'
    ceilingM = null
  }

  const typeLabel = type != null ? TYPE_LABELS[type] : undefined
  const label = typeLabel ? `${name} — ${typeLabel}` : name

  return {
    id: `openaip:${id}`,
    limite: label,
    remarque: `Classe ${props.icaoClass != null ? props.icaoClass : '—'} · OpenAIP`,
    ceilingM,
    status,
    geometry: toMultiPolygon(feature.geometry),
    source: 'openaip',
    airspaceType: type,
  }
}

async function fetchCountry(code: string, signal?: AbortSignal): Promise<AirspaceRestriction[]> {
  if (countryCache.has(code)) return countryCache.get(code) ?? []

  const pending = inFlight.get(code)
  if (pending) return pending

  const load = getJSON<OpenAipCollection>(countryUrl(code), { signal, timeoutMs: 30_000 })
    .then((data) => {
      const restrictions = (data.features ?? [])
        .map(toRestriction)
        .filter((r): r is AirspaceRestriction => r != null && r.geometry != null)
      countryCache.set(code, restrictions)
      return restrictions
    })
    .catch((error) => {
      if ((error as { name?: string }).name === 'AbortError') throw error
      // A 404 means the country simply has no published airspace — cache it empty.
      if ((error as { status?: number }).status === 404) {
        countryCache.set(code, [])
        return []
      }
      throw error
    })
    .finally(() => {
      inFlight.delete(code)
    })

  inFlight.set(code, load)
  return load
}

export async function loadCountriesForBBox(
  bbox: [number, number, number, number],
  signal?: AbortSignal,
): Promise<void> {
  const countries = countriesIntersectingBBox(bbox)
  await Promise.all(countries.map((country) => fetchCountry(country.code, signal)))
}

/** All airspaces (not point-filtered) for countries intersecting the bbox. */
export async function getRestrictionsInBBox(
  bbox: [number, number, number, number],
  signal?: AbortSignal,
): Promise<AirspaceRestriction[]> {
  const countries = countriesIntersectingBBox(bbox)
  const grouped = await Promise.all(
    countries.map((country) => fetchCountry(country.code, signal)),
  )
  return grouped.flat()
}

export async function getRestrictionsAtPoint(
  coordinates: Coordinates,
  signal?: AbortSignal,
): Promise<AirspaceRestriction[]> {
  const country = countryForPoint(coordinates)
  if (!country) return []
  const restrictions = await fetchCountry(country.code, signal)
  return restrictions.filter(
    (restriction) =>
      restriction.geometry != null &&
      pointInMultiPolygon(restriction.geometry.coordinates, coordinates),
  )
}
