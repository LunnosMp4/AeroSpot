export interface Coordinates {
  lng: number
  lat: number
}

export type SpotCategory = 'bando' | 'freestyle' | 'cinematic' | 'race' | 'park'

export type SpotSource = 'seed' | 'user' | 'overpass' | 'catalog'

export type LegalStatus = 'clear' | 'limited' | 'prohibited' | 'unknown'

export interface RouteInfo {
  travelTimeMin: number
  distanceKm: number
  fromHomeId: string
  computedAt: string
}

export interface Spot {
  id: string
  name: string
  description?: string
  city?: string
  category: SpotCategory
  tags: string[]
  coordinates: Coordinates
  altitudeCeilingM: number | null
  legalStatus: LegalStatus
  thumbnailUrl?: string
  source: SpotSource
  createdAt: string
  route?: RouteInfo
}

export interface SpotDraft {
  name: string
  description?: string
  city?: string
  category: SpotCategory
  tags: string[]
  coordinates: Coordinates
  thumbnailUrl?: string
}

export const SPOT_CATEGORY_LABELS: Record<SpotCategory, string> = {
  bando: 'Bando',
  freestyle: 'Freestyle',
  cinematic: 'Cinématique',
  race: 'Race',
  park: 'Parc',
}

export const SPOT_CATEGORY_COLORS: Record<SpotCategory, string> = {
  bando: '#f0a83c',
  freestyle: '#6d8cff',
  cinematic: '#c084fc',
  race: '#f0524d',
  park: '#35d07f',
}
