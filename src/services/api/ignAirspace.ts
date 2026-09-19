import type { AirspaceRestriction, Coordinates, LegalityResult } from '@/types'
import { CONFIG, DATASETS } from '@/services/config'
import { getJSON } from './http'
import { parseLimite, resolveLegality } from '@/services/regulation'
import { bboxAround, pointInMultiPolygon } from '@/utils/geo'

interface WfsFeature {
  id: string
  geometry: GeoJSON.MultiPolygon
  properties: {
    limite?: string
    remarque?: string
  }
}

interface WfsFeatureCollection {
  type: 'FeatureCollection'
  features: WfsFeature[]
  totalFeatures?: number
}

const CRS84 = 'urn:ogc:def:crs:OGC:1.3:CRS84'

function wfsGetFeature(params: Record<string, string | number>): string {
  const url = new URL(CONFIG.ignWfs)
  const search = new URLSearchParams({
    SERVICE: 'WFS',
    VERSION: '2.0.0',
    REQUEST: 'GetFeature',
    TYPENAMES: DATASETS.droneRestrictionsWfsType,
    OUTPUTFORMAT: 'application/json',
    SRSNAME: 'EPSG:4326',
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  })
  url.search = search.toString()
  return url.toString()
}

function toRestrictions(data: WfsFeatureCollection): AirspaceRestriction[] {
  return (data.features ?? []).map((feature) => {
    const limite = feature.properties?.limite?.trim() ?? ''
    const parsed = parseLimite(limite)
    return {
      id: feature.id,
      limite: limite || 'Zone réglementée',
      remarque: feature.properties?.remarque,
      ceilingM: parsed.ceilingM,
      status: parsed.status,
      geometry: feature.geometry,
    }
  })
}

export async function getRestrictionsInBBox(
  bbox: [number, number, number, number],
  signal?: AbortSignal,
  limit = 60,
): Promise<AirspaceRestriction[]> {
  const url = wfsGetFeature({
    BBOX: `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]},${CRS84}`,
    COUNT: limit,
  })
  const data = await getJSON<WfsFeatureCollection>(url, { signal, timeoutMs: 14_000 })
  return toRestrictions(data)
}

export async function getRestrictionsAtPoint(
  coordinates: Coordinates,
  signal?: AbortSignal,
): Promise<AirspaceRestriction[]> {
  const restrictions = await getRestrictionsInBBox(
    bboxAround(coordinates, 0.0016, 0.0012),
    signal,
    120,
  )
  return restrictions.filter(
    (restriction) =>
      restriction.geometry != null &&
      pointInMultiPolygon(restriction.geometry.coordinates, coordinates),
  )
}

export async function inspectLegality(
  coordinates: Coordinates,
  signal?: AbortSignal,
): Promise<LegalityResult> {
  const restrictions = await getRestrictionsAtPoint(coordinates, signal)
  const { maxAltitudeM, status } = resolveLegality(restrictions)
  return {
    coordinates,
    maxAltitudeM,
    status,
    restrictions,
    checkedAt: new Date().toISOString(),
    source: 'wfs',
  }
}
