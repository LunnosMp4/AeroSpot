import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { STORAGE_KEYS, readJSON, writeJSON } from '@/services/storage'
import { getDefaultPluginIds } from '@/plugins/first-party'
import type { PluginSettingsAccess } from '@/plugins/types'

export const usePluginsStore = defineStore('plugins', () => {
  const saved = readJSON<string[]>(STORAGE_KEYS.plugins, [])
  const enabledIds = ref<string[]>([...new Set([...getDefaultPluginIds(), ...saved])])

  const count = computed(() => enabledIds.value.length)

  function isEnabled(id: string): boolean {
    return enabledIds.value.includes(id)
  }

  function setEnabled(id: string, value: boolean): void {
    enabledIds.value = value
      ? [...new Set([...enabledIds.value, id])]
      : enabledIds.value.filter((existing) => existing !== id)
    persist()
  }

  function persist(): void {
    writeJSON<string[]>(STORAGE_KEYS.plugins, enabledIds.value)
  }

  return { enabledIds, count, isEnabled, setEnabled }
})

export function pluginSettingsAccess(store: ReturnType<typeof usePluginsStore>): PluginSettingsAccess {
  return {
    isEnabled: (id) => store.isEnabled(id),
    setEnabled: (id, value) => store.setEnabled(id, value),
    enabledIds: () => [...store.enabledIds],
  }
}
