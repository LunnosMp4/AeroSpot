import { ref } from 'vue'
import type { Spot } from '@/types'
import { STORAGE_KEYS, readJSON, writeJSON } from './storage'
import * as backend from './api/backend'

export type PersistenceMode = 'server' | 'local'

/** Reactive so the UI can tell whether spots are shared or browser-only. */
export const persistenceMode = ref<PersistenceMode>('local')

function localSpots(): Spot[] {
  return readJSON<Spot[]>(STORAGE_KEYS.userSpots, [])
}
function setLocalSpots(spots: Spot[]): void {
  writeJSON<Spot[]>(STORAGE_KEYS.userSpots, spots)
}
function localSaved(): string[] {
  return readJSON<string[]>(STORAGE_KEYS.saved, [])
}
function setLocalSaved(ids: string[]): void {
  writeJSON<string[]>(STORAGE_KEYS.saved, ids)
}
function localSavedSpots(): Spot[] {
  return readJSON<Spot[]>(STORAGE_KEYS.savedSpots, [])
}
function setLocalSavedSpots(spots: Spot[]): void {
  writeJSON<Spot[]>(STORAGE_KEYS.savedSpots, spots)
}

/**
 * Shared persistence when the app is served by the AeroSpot backend; otherwise
 * transparently falls back to localStorage (static hosting / offline).
 */
export const persistence = {
  async init(): Promise<PersistenceMode> {
    persistenceMode.value = (await backend.isAvailable()) ? 'server' : 'local'
    return persistenceMode.value
  },

  async loadSpots(): Promise<Spot[]> {
    if (persistenceMode.value === 'server') {
      try {
        const remote = await backend.fetchSpots()
        setLocalSpots(remote)
        return remote
      } catch {
        /* fall back to cache */
      }
    }
    return localSpots()
  },

  async addSpot(spot: Spot): Promise<void> {
    setLocalSpots([spot, ...localSpots().filter((item) => item.id !== spot.id)])
    if (persistenceMode.value === 'server') {
      try {
        await backend.createSpot(spot)
      } catch (error) {
        console.warn('[AeroSpot] enregistrement serveur échoué, copie locale conservée:', error)
      }
    }
  },

  async removeSpot(id: string): Promise<void> {
    setLocalSpots(localSpots().filter((item) => item.id !== id))
    if (persistenceMode.value === 'server') {
      try {
        await backend.deleteSpot(id)
      } catch {
        /* local cache already updated */
      }
    }
  },

  async loadSaved(): Promise<string[]> {
    if (persistenceMode.value === 'server') {
      try {
        const remote = await backend.fetchSaved()
        setLocalSaved(remote)
        return remote
      } catch {
        /* fall back to cache */
      }
    }
    return localSaved()
  },

  /**
   * Full spot data for saved spots, so a saved spot stays on the map even after
   * the discovered spots are replaced or cleared.
   */
  async loadSavedSpots(): Promise<Spot[]> {
    return localSavedSpots()
  },

  async saveSpotData(spot: Spot): Promise<void> {
    setLocalSavedSpots([spot, ...localSavedSpots().filter((item) => item.id !== spot.id)])
  },

  async unsaveSpotData(id: string): Promise<void> {
    setLocalSavedSpots(localSavedSpots().filter((item) => item.id !== id))
  },

  async save(id: string): Promise<void> {
    setLocalSaved([...new Set([...localSaved(), id])])
    if (persistenceMode.value === 'server') {
      try {
        await backend.saveSpot(id)
      } catch {
        /* local cache already updated */
      }
    }
  },

  async unsave(id: string): Promise<void> {
    setLocalSaved(localSaved().filter((item) => item !== id))
    if (persistenceMode.value === 'server') {
      try {
        await backend.unsaveSpot(id)
      } catch {
        /* local cache already updated */
      }
    }
  },
}
