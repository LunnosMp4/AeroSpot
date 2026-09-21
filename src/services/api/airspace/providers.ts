import type { AirspaceRestriction, AirspaceSource, Coordinates, LegalityResult } from '@/types'
import {
  getRestrictionsInBBox as getIgnRestrictionsInBBox,
  getRestrictionsAtPoint as getIgnRestrictionsAtPoint,
} from '@/services/api/ignAirspace'
import * as openaip from './openaip'
import { resolveLegality } from '@/services/regulation'
import { isInFrance } from '@/utils/geo'

function sourceFor(coordinates: Coordinates): AirspaceSource {
  return isInFrance(coordinates) ? 'ign-fr' : 'openaip'
}

/**
 * Merged bbox query across all airspace providers (France IGN + OpenAIP).
 * Returns restrictions that may still need local point-in-polygon filtering.
 */
export async function getRestrictionsInBBox(
  bbox: [number, number, number, number],
  signal?: AbortSignal,
  limit = 60,
): Promise<AirspaceRestriction[]> {
  const [ign, international] = await Promise.all([
    getIgnRestrictionsInBBox(bbox, signal, limit).catch(() => []),
    openaip.getRestrictionsInBBox(bbox, signal).catch(() => []),
  ])
  return [...ign, ...international]
}

export async function getRestrictionsAtPoint(
  coordinates: Coordinates,
  signal?: AbortSignal,
): Promise<AirspaceRestriction[]> {
  if (isInFrance(coordinates)) {
    return getIgnRestrictionsAtPoint(coordinates, signal)
  }
  return openaip.getRestrictionsAtPoint(coordinates, signal)
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
    source: sourceFor(coordinates),
  }
}
