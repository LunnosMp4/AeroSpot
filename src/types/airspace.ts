import type { Coordinates, LegalStatus } from './spot'

export type AirspaceSource = 'ign-fr' | 'openaip'

export interface AirspaceRestriction {
  id: string
  limite: string
  remarque?: string
  ceilingM: number | null
  status: LegalStatus
  geometry?: GeoJSON.MultiPolygon
  /** Provider that produced this restriction. */
  source?: AirspaceSource
  /** OpenAIP airspace type numeric code, when applicable. */
  airspaceType?: number
}

export interface LegalityResult {
  coordinates: Coordinates
  maxAltitudeM: number | null
  status: LegalStatus
  restrictions: AirspaceRestriction[]
  checkedAt: string
  source: AirspaceSource | 'wfs' | 'wms-gfi'
}

export interface AirspaceQuery {
  bbox?: [number, number, number, number]
  limit?: number
}
