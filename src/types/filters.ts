import type { LegalStatus, SpotCategory } from './spot'

export type SortBy = 'driveTime' | 'distance' | 'name'

export const MAX_DRIVE_MIN = 120

export interface FilterCriteria {
  maxDriveMin: number
  categories: SpotCategory[]
  legalStatuses: LegalStatus[]
  savedOnly: boolean
  sortBy: SortBy
  query: string
}

export const DEFAULT_FILTERS: FilterCriteria = {
  maxDriveMin: MAX_DRIVE_MIN,
  categories: ['bando', 'freestyle', 'cinematic', 'race', 'park'],
  // Prohibited zones are hidden by default: only surface legal spots.
  legalStatuses: ['clear', 'limited', 'unknown'],
  savedOnly: false,
  sortBy: 'driveTime',
  query: '',
}
