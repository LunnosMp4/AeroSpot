import type { AirspaceRestriction, LegalStatus } from '@/types'

export const STANDARD_CEILING_M = 120

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export interface ParsedLimite {
  ceilingM: number | null
  status: LegalStatus
}

/**
 * The IGN WFS exposes a single free-text `limite` attribute per zone.
 * Values observed include "Vol interdit *", "Hauteur limite 30 m", etc.
 * This parser is intentionally tolerant and maps to a numeric ceiling.
 */
export function parseLimite(limite: string): ParsedLimite {
  const text = normalize(limite)

  if (!text) {
    return { ceilingM: null, status: 'unknown' }
  }

  if (/interdit|prohib|exclu/.test(text)) {
    return { ceilingM: 0, status: 'prohibited' }
  }

  const heightMatch = text.match(/(\d{2,3})\s*m\b/)
  if (heightMatch) {
    const value = Number(heightMatch[1])
    return { ceilingM: value, status: value <= 0 ? 'prohibited' : 'limited' }
  }

  if (/restrict|limit|soumis|condition|autorisation/.test(text)) {
    return { ceilingM: null, status: 'limited' }
  }

  if (/aeromod|loisir|autorise|facilit/.test(text)) {
    return { ceilingM: null, status: 'clear' }
  }

  return { ceilingM: null, status: 'limited' }
}

export interface ResolvedLegality {
  maxAltitudeM: number
  status: LegalStatus
}

export function resolveLegality(restrictions: AirspaceRestriction[]): ResolvedLegality {
  if (restrictions.length === 0) {
    return { maxAltitudeM: STANDARD_CEILING_M, status: 'clear' }
  }

  let min = STANDARD_CEILING_M
  let prohibited = false

  for (const restriction of restrictions) {
    if (restriction.ceilingM == null) continue
    if (restriction.ceilingM <= 0) prohibited = true
    min = Math.min(min, restriction.ceilingM)
  }

  if (prohibited) return { maxAltitudeM: 0, status: 'prohibited' }
  return { maxAltitudeM: min, status: min < STANDARD_CEILING_M ? 'limited' : 'clear' }
}

export const LEGAL_STATUS_LABELS: Record<LegalStatus, string> = {
  clear: 'Vol autorisé (120 m)',
  limited: 'Hauteur limitée',
  prohibited: 'Vol interdit',
  unknown: 'À vérifier',
}
