import type { Coordinates } from '@/types'

const DASH = '—'

export function formatDurationMin(min: number | null | undefined): string {
  if (min == null || !Number.isFinite(min)) return DASH
  if (min < 1) return '< 1 min'
  if (min < 60) return `${Math.round(min)} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

export function formatDistanceKm(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return DASH
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`
}

export function formatCoordinates(c: Coordinates, decimals = 5): string {
  return `${c.lat.toFixed(decimals)}, ${c.lng.toFixed(decimals)}`
}

export function formatAltitude(m: number | null | undefined): string {
  if (m == null) return 'Inconnu'
  if (m <= 0) return 'Vol interdit'
  return `${m} m`
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return DASH
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
