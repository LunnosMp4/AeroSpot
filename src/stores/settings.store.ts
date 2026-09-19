import { defineStore } from 'pinia'
import { ref } from 'vue'
import { STORAGE_KEYS, readJSON, writeJSON } from '@/services/storage'

export type BasemapKey = 'dark' | 'light' | 'satellite'

const BASEMAP_KEYS: BasemapKey[] = ['dark', 'light', 'satellite']

export interface PersistedSettings {
  basemap: BasemapKey
  layerVisibility: Record<string, boolean>
}

const DEFAULT_SETTINGS: PersistedSettings = {
  basemap: 'dark',
  layerVisibility: { airspace: true, isochrone: false },
}

export const useSettingsStore = defineStore('settings', () => {
  const saved = readJSON<Partial<PersistedSettings>>(STORAGE_KEYS.settings, {})

  const basemap = ref<BasemapKey>(
    BASEMAP_KEYS.includes(saved.basemap as BasemapKey)
      ? (saved.basemap as BasemapKey)
      : DEFAULT_SETTINGS.basemap,
  )
  const layerVisibility = ref<Record<string, boolean>>({
    ...DEFAULT_SETTINGS.layerVisibility,
    ...(saved.layerVisibility ?? {}),
  })

  function persist(): void {
    writeJSON<PersistedSettings>(STORAGE_KEYS.settings, {
      basemap: basemap.value,
      layerVisibility: layerVisibility.value,
    })
  }

  function isLayerVisible(id: string, fallback = true): boolean {
    return layerVisibility.value[id] ?? fallback
  }

  function setLayerVisible(id: string, value: boolean): void {
    layerVisibility.value = { ...layerVisibility.value, [id]: value }
    persist()
  }

  function toggleLayer(id: string, fallback = true): void {
    setLayerVisible(id, !isLayerVisible(id, fallback))
  }

  function setBasemap(value: BasemapKey): void {
    basemap.value = value
    persist()
  }

  return {
    basemap,
    layerVisibility,
    isLayerVisible,
    setLayerVisible,
    toggleLayer,
    setBasemap,
  }
})
