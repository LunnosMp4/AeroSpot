import type { Coordinates, LegalityResult } from '@/types'
import { coordKey } from '@/utils/geo'

interface CacheRecord {
  result: LegalityResult
  cachedAt: number
}

type CacheMap = Record<string, CacheRecord>

const TTL_MS = 1000 * 60 * 60 * 24 * 30
const MEMORY: CacheMap = {}

export function getCachedLegality(coordinates: Coordinates): LegalityResult | null {
  const key = coordKey(coordinates)
  const record = MEMORY[key]
  if (!record) return null
  if (Date.now() - record.cachedAt > TTL_MS) {
    delete MEMORY[key]
    return null
  }
  return record.result
}

export function setCachedLegality(coordinates: Coordinates, result: LegalityResult): void {
  MEMORY[coordKey(coordinates)] = { result, cachedAt: Date.now() }
}
