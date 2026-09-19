import type { Coordinates } from '@/types'

const EARTH_RADIUS_KM = 6371.0088
const DEG2RAD = Math.PI / 180

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = (b.lat - a.lat) * DEG2RAD
  const dLng = (b.lng - a.lng) * DEG2RAD
  const lat1 = a.lat * DEG2RAD
  const lat2 = b.lat * DEG2RAD
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function roundCoord(value: number, decimals = 5): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function isInFrance(c: Coordinates): boolean {
  return c.lat >= 41 && c.lat <= 51.5 && c.lng >= -5.5 && c.lng <= 9.8
}

export function bboxAround(
  c: Coordinates,
  deltaLng = 0.01,
  deltaLat = 0.008,
): [number, number, number, number] {
  return [c.lng - deltaLng, c.lat - deltaLat, c.lng + deltaLng, c.lat + deltaLat]
}

export function coordKey(c: Coordinates, decimals = 4): string {
  return `${c.lng.toFixed(decimals)},${c.lat.toFixed(decimals)}`
}

type Ring = number[][]

function pointInRing(point: Coordinates, ring: Ring): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]?.[0]
    const yi = ring[i]?.[1]
    const xj = ring[j]?.[0]
    const yj = ring[j]?.[1]
    if (xi == null || yi == null || xj == null || yj == null) continue
    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

/** GeoJSON MultiPolygon coordinates are [lng, lat]. First ring is outer, rest are holes. */
export function pointInMultiPolygon(
  coordinates: number[][][][],
  point: Coordinates,
): boolean {
  for (const polygon of coordinates) {
    const [outer, ...holes] = polygon
    if (!outer || !pointInRing(point, outer)) continue
    const inHole = holes.some((hole) => pointInRing(point, hole))
    if (!inHole) return true
  }
  return false
}

