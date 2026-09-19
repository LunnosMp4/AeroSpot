import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FilterCriteria, LegalStatus, SortBy, SpotCategory } from '@/types'
import { DEFAULT_FILTERS } from '@/types'
import { STORAGE_KEYS, readJSON, writeJSON } from '@/services/storage'

export const useFiltersStore = defineStore('filters', () => {
  const saved = readJSON<Partial<FilterCriteria>>(STORAGE_KEYS.filters, {})
  const criteria = ref<FilterCriteria>({ ...DEFAULT_FILTERS, ...saved })

  function persist(): void {
    writeJSON<FilterCriteria>(STORAGE_KEYS.filters, criteria.value)
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
