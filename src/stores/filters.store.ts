import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FilterCriteria, LegalStatus, SortBy, SpotCategory } from '@/types'
import { DEFAULT_FILTERS } from '@/types'
import { STORAGE_KEYS, readJSON, writeJSON } from '@/services/storage'

const FILTERS_VERSION = 3

interface PersistedFilters extends Partial<FilterCriteria> {
  version?: number
}

export const useFiltersStore = defineStore('filters', () => {
  const saved = readJSON<PersistedFilters>(STORAGE_KEYS.filters, {})

  // Migrate legacy criteria so newly introduced categories (e.g. paragliding)
  // become visible instead of staying hidden by an outdated persisted list.
  if (Object.keys(saved).length > 0 && saved.version !== FILTERS_VERSION) {
    saved.categories = [...new Set([...(saved.categories ?? []), ...DEFAULT_FILTERS.categories])]
    saved.version = FILTERS_VERSION
    writeJSON<PersistedFilters>(STORAGE_KEYS.filters, saved)
  }

  const criteria = ref<FilterCriteria>({ ...DEFAULT_FILTERS, ...saved })

  function persist(): void {
    writeJSON<PersistedFilters>(STORAGE_KEYS.filters, {
      ...criteria.value,
      version: FILTERS_VERSION,
    })
  }

  function patch(partial: Partial<FilterCriteria>): void {
    criteria.value = { ...criteria.value, ...partial }
    persist()
  }

  function toggleCategory(category: SpotCategory): void {
    const current = criteria.value.categories
    const next = current.includes(category)
      ? current.filter((item) => item !== category)
      : [...current, category]
    patch({ categories: next })
  }

  function toggleLegalStatus(status: LegalStatus): void {
    const current = criteria.value.legalStatuses
    const next = current.includes(status)
      ? current.filter((item) => item !== status)
      : [...current, status]
    patch({ legalStatuses: next })
  }

  function setMaxDrive(minutes: number): void {
    patch({ maxDriveMin: minutes })
  }

  function setSavedOnly(value: boolean): void {
    patch({ savedOnly: value })
  }

  function toggleSavedOnly(): void {
    patch({ savedOnly: !criteria.value.savedOnly })
  }

  function setSortBy(sortBy: SortBy): void {
    patch({ sortBy })
  }

  function setQuery(query: string): void {
    patch({ query })
  }

  function reset(): void {
    criteria.value = { ...DEFAULT_FILTERS }
    persist()
  }

  return {
    criteria,
    patch,
    toggleCategory,
    toggleLegalStatus,
    setMaxDrive,
    setSavedOnly,
    toggleSavedOnly,
    setSortBy,
    setQuery,
    reset,
  }
})
