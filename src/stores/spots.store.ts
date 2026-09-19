import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { RouteInfo, Spot, SpotDraft } from '@/types'
import { MAX_DRIVE_MIN } from '@/types'
import { computeMatrix } from '@/services/api/osrm'
import { persistence } from '@/services/persistence'
import { SEED_SPOTS } from '@/data/seedSpots'
import { coordKey, haversineKm } from '@/utils/geo'
import { useAirspaceStore } from './airspace.store'
import { useFiltersStore } from './filters.store'
import { useHomeStore } from './home.store'

const CANDIDATE_LIMIT = 400
const DISPLAY_LIMIT = 300

function stripAccents(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function compareRoute(a: Spot, b: Spot, key: 'travelTimeMin' | 'distanceKm'): number {
  const av = a.route?.[key]
  const bv = b.route?.[key]
  if (av == null && bv == null) return a.name.localeCompare(b.name, 'fr')
  if (av == null) return 1
  if (bv == null) return -1
  if (av === bv) return a.name.localeCompare(b.name, 'fr')
  return av - bv
}

export const useSpotsStore = defineStore('spots', () => {
  const airspace = useAirspaceStore()
  const filters = useFiltersStore()
  const home = useHomeStore()

  const seed = ref<Spot[]>([])
  const user = ref<Spot[]>([])
  const external = ref<Spot[]>([])
  const catalog = ref<Spot[]>([])
  const catalogLoading = ref(false)
  const savedIds = ref<string[]>([])

  const routes = ref<Record<string, RouteInfo>>({})
  const matrixLoading = ref(false)
  const matrixError = ref<string | null>(null)
  const matrixSignature = ref<string | null>(null)

  let matrixAbort: AbortController | null = null
  let runSeq = 0

  function loadSeed(): void {
    seed.value = SEED_SPOTS
  }

  async function initLibrary(): Promise<void> {
    user.value = await persistence.loadSpots()
    savedIds.value = await persistence.loadSaved()
  }

  async function loadCatalog(): Promise<void> {
    if (catalog.value.length > 0 || catalogLoading.value) return
    catalogLoading.value = true
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}spots-fr.json`)
      if (response.ok) {
        const data = (await response.json()) as Spot[]
        catalog.value = Array.isArray(data) ? data.map((spot) => ({ ...spot, source: 'catalog' })) : []
      }
    } catch {
      /* bundled catalogue is optional */
    } finally {
      catalogLoading.value = false
    }
  }

  const baseSpots = computed<Spot[]>(() => {
    const seen = new Set<string>()
    const merged: Spot[] = []
    for (const spot of [...external.value, ...user.value, ...catalog.value, ...seed.value]) {
      if (seen.has(spot.id)) continue
      seen.add(spot.id)
      merged.push(spot)
    }
    return merged
  })

  const allSpots = computed<Spot[]>(() =>
    baseSpots.value.map((spot) => {
      const legality = airspace.bySpotId[spot.id]
      const route = routes.value[spot.id]
      return {
        ...spot,
        altitudeCeilingM: legality?.maxAltitudeM ?? spot.altitudeCeilingM,
        legalStatus: legality?.status ?? spot.legalStatus,
        route,
      }
    }),
  )

  const userSpots = computed(() => user.value)

  const spotById = computed(() => {
    const index = new Map<string, Spot>()
    for (const spot of allSpots.value) index.set(spot.id, spot)
    return index
  })

  /**
   * Bounded working set. With a national OSM catalogue (10k+ spots) we only
   * route/render the spots nearest to the home base, keeping API and DOM work flat.
   */
  const candidateSpots = computed<Spot[]>(() => {
    const list = allSpots.value
    const origin = home.coordinates
    const savedSet = new Set(savedIds.value)
    const savedList = list.filter((spot) => savedSet.has(spot.id))

    if (!origin) {
      // Without a base there is nothing to rank by distance, so only show the
      // curated, user, discovered and saved spots — not the national catalogue.
      return list.filter((spot) => spot.source !== 'catalog' || savedSet.has(spot.id))
    }

    const nearest = list
      .map((spot) => ({ spot, distance: haversineKm(origin, spot.coordinates) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, CANDIDATE_LIMIT)
      .map((entry) => entry.spot)

    // Saved spots are always candidates, even far from the base.
    const seen = new Set(nearest.map((spot) => spot.id))
    return [...nearest, ...savedList.filter((spot) => !seen.has(spot.id))]
  })

  function matchesFilters(spot: Spot): boolean {
    const criteria = filters.criteria
    if (!criteria.categories.includes(spot.category)) return false
    if (criteria.legalStatuses.length > 0 && !criteria.legalStatuses.includes(spot.legalStatus)) {
      return false
    }
    if (criteria.query.trim()) {
      const needle = stripAccents(criteria.query)
      const haystack = stripAccents(
        [spot.name, spot.city ?? '', spot.description ?? '', spot.tags.join(' ')].join(' '),
      )
      if (!haystack.includes(needle)) return false
    }
    if (criteria.savedOnly && !savedIds.value.includes(spot.id)) return false
    if (home.home && spot.route) {
      const limit =
        criteria.maxDriveMin >= MAX_DRIVE_MIN ? Number.POSITIVE_INFINITY : criteria.maxDriveMin
      if (spot.route.travelTimeMin > limit) return false
    }
    return true
  }

  const filteredSpots = computed(() => candidateSpots.value.filter(matchesFilters))

  const visibleSpots = computed<Spot[]>(() => {
    const list = [...filteredSpots.value]
    const sortBy = filters.criteria.sortBy
    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    } else if (sortBy === 'distance') {
      list.sort((a, b) => compareRoute(a, b, 'distanceKm'))
    } else {
      list.sort((a, b) => compareRoute(a, b, 'travelTimeMin'))
    }
    return list.slice(0, DISPLAY_LIMIT)
  })

  const totalCount = computed(() => allSpots.value.length)
  const catalogCount = computed(() => catalog.value.length)
  const savedCount = computed(() => savedIds.value.length)

  function isSaved(id: string): boolean {
    return savedIds.value.includes(id)
  }

  function toggleSaved(id: string): boolean {
    const next = !isSaved(id)
    savedIds.value = next
      ? [...savedIds.value, id]
      : savedIds.value.filter((item) => item !== id)
    void (next ? persistence.save(id) : persistence.unsave(id))
    return next
  }

  function addUserSpot(draft: SpotDraft): Spot {
    const spot: Spot = {
      id: uid('user'),
      source: 'user',
      createdAt: new Date().toISOString(),
      altitudeCeilingM: null,
      legalStatus: 'unknown',
      ...draft,
      tags: [...new Set(draft.tags.map((tag) => tag.trim()).filter(Boolean))],
    }
    user.value = [spot, ...user.value]
    void persistence.addSpot(spot)
    return spot
  }

  function removeUserSpot(id: string): void {
    user.value = user.value.filter((spot) => spot.id !== id)
    if (isSaved(id)) {
      savedIds.value = savedIds.value.filter((item) => item !== id)
      void persistence.unsave(id)
    }
    void persistence.removeSpot(id)
  }

  function setExternalSpots(spots: Spot[]): void {
    external.value = spots
  }

  function clearExternalSpots(): void {
    external.value = []
  }

  async function computeRoutes(force = false): Promise<void> {
    const homeCoordinates = home.coordinates
    if (!homeCoordinates) {
      routes.value = {}
      matrixSignature.value = null
      return
    }

    const points = candidateSpots.value.map((spot) => ({ id: spot.id, coordinates: spot.coordinates }))
    const signature = `${coordKey(homeCoordinates)}|${points.map((point) => point.id).join(',')}`

    if (!force && matrixSignature.value === signature && Object.keys(routes.value).length === points.length) {
      return
    }

    matrixAbort?.abort()
    matrixAbort = new AbortController()
    const run = ++runSeq
    matrixLoading.value = true
    matrixError.value = null

    try {
      const entries = await computeMatrix(homeCoordinates, points, matrixAbort.signal)
      if (run !== runSeq) return

      const next: Record<string, RouteInfo> = {}
      const now = new Date().toISOString()
      for (const entry of entries) {
        if (entry.durationSec == null && entry.distanceM == null) continue
        next[entry.id] = {
          travelTimeMin: (entry.durationSec ?? 0) / 60,
          distanceKm: (entry.distanceM ?? 0) / 1000,
          fromHomeId: coordKey(homeCoordinates),
          computedAt: now,
        }
      }
      routes.value = next
      matrixSignature.value = signature
    } catch (error) {
      if (run !== runSeq) return
      if ((error as { name?: string }).name === 'AbortError') return
      matrixError.value =
        error instanceof Error ? error.message : 'Calcul des temps de trajet indisponible.'
    } finally {
      if (run === runSeq) matrixLoading.value = false
    }
  }

  function clearRoutes(): void {
    matrixAbort?.abort()
    routes.value = {}
    matrixSignature.value = null
    matrixError.value = null
  }

  return {
    seed,
    user,
    external,
    catalog,
    catalogLoading,
    savedIds,
    savedCount,
    userSpots,
    baseSpots,
    allSpots,
    candidateSpots,
    spotById,
    filteredSpots,
    visibleSpots,
    totalCount,
    catalogCount,
    routes,
    matrixLoading,
    matrixError,
    loadSeed,
    loadCatalog,
    initLibrary,
    isSaved,
    toggleSaved,
    addUserSpot,
    removeUserSpot,
    setExternalSpots,
    clearExternalSpots,
    computeRoutes,
    clearRoutes,
  }
})
