import type { Coordinates, LegalStatus } from './spot'

export interface AirspaceRestriction {
  id: string
  limite: string
  remarque?: string
  ceilingM: number | null
  status: LegalStatus
  geometry?: GeoJSON.MultiPolygon
}

export interface LegalityResult {
  coordinates: Coordinates
  maxAltitudeM: number | null
  status: LegalStatus
  restrictions: AirspaceRestriction[]
  checkedAt: string
  source: 'wfs' | 'wms-gfi'
}

export interface AirspaceQuery {
  bbox?: [number, number, number, number]
  limit?: number
}
