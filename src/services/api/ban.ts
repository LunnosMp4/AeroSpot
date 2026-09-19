import type { Coordinates } from '@/types'
import { CONFIG } from '@/services/config'
import { buildUrl, getJSON } from './http'

interface BanFeature {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: {
    id?: string
    label: string
    score?: number
    housenumber?: string
    street?: string
    name?: string
    postcode?: string
    citycode?: string
    city?: string
    context?: string
    type?: string
  }
}

interface BanResponse {
  type: 'FeatureCollection'
  features: BanFeature[]
}

export interface AddressSuggestion {
  id: string
  label: string
  city?: string
  postcode?: string
  citycode?: string
  context?: string
  type?: string
  score: number
  coordinates: Coordinates
}

export interface SearchOptions {
  limit?: number
  bias?: Coordinates
  signal?: AbortSignal
}

function toSuggestion(feature: BanFeature): AddressSuggestion {
  const [lng, lat] = feature.geometry.coordinates
  const props = feature.properties
  return {
    id: props.id ?? `${lng},${lat}`,
    label: props.label,
    city: props.city,
    postcode: props.postcode,
    citycode: props.citycode,
    context: props.context,
    type: props.type,
    score: props.score ?? 0,
    coordinates: { lng, lat },
  }
}

export async function searchAddress(query: string, options: SearchOptions = {}): Promise<AddressSuggestion[]> {
  const trimmed = query.trim()
  if (trimmed.length < 3) return []

  const url = buildUrl(CONFIG.banApi, '/search/', {
    q: trimmed,
    limit: options.limit ?? 6,
    autocomplete: 1,
    lat: options.bias?.lat,
    lon: options.bias?.lng,
  })

  const data = await getJSON<BanResponse>(url, { signal: options.signal, timeoutMs: 8_000 })
  return (data.features ?? []).map(toSuggestion)
}

export async function reverseGeocode(
  coordinates: Coordinates,
  signal?: AbortSignal,
): Promise<AddressSuggestion | null> {
  const url = buildUrl(CONFIG.banApi, '/reverse/', {
    lat: coordinates.lat,
    lon: coordinates.lng,
    limit: 1,
  })
  const data = await getJSON<BanResponse>(url, { signal, timeoutMs: 8_000 })
  const feature = data.features?.[0]
  return feature ? toSuggestion(feature) : null
}
