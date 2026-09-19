import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'maplibre-gl/dist/maplibre-gl.css'
import './style.css'
import App from './App.vue'
import { createPluginHost } from './plugins'
import { firstPartyPlugins } from './plugins/first-party'
import { pluginSettingsAccess, usePluginsStore } from './stores/plugins.store'
import { useAirspaceStore } from './stores/airspace.store'
import { useFiltersStore } from './stores/filters.store'
import { useHomeStore } from './stores/home.store'
import { useSpotsStore } from './stores/spots.store'

async function bootstrap(): Promise<void> {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)

  const pluginsStore = usePluginsStore(pinia)
  const host = createPluginHost(pluginSettingsAccess(pluginsStore))
  host.registerAll(firstPartyPlugins)
  await host.sync()

  if (import.meta.env.DEV) {
    ;(window as unknown as Record<string, unknown>).__aerospot = {
      spots: useSpotsStore(pinia),
      airspace: useAirspaceStore(pinia),
      filters: useFiltersStore(pinia),
      home: useHomeStore(pinia),
    }
  }

  app.mount('#app')
}

void bootstrap()
