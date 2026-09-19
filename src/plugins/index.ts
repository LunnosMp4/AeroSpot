import type { Map as MapLibreMap } from 'maplibre-gl'
import { KeyedRegistry } from './registry'
import type {
  AeroSpotPlugin,
  LayerDefinition,
  PanelDefinition,
  PluginContext,
  PluginSettingsAccess,
  SpotEnrichment,
  SpotProvider,
} from './types'

export class PluginHost {
  readonly layers = new KeyedRegistry<LayerDefinition>()
  readonly spotProviders = new KeyedRegistry<SpotProvider>()
  readonly enrichments = new KeyedRegistry<SpotEnrichment>()
  readonly panels = new KeyedRegistry<PanelDefinition>()

  private readonly plugins = new Map<string, AeroSpotPlugin>()
  private readonly activated = new Set<string>()
  private mapRef: MapLibreMap | null = null

  constructor(private readonly settings: PluginSettingsAccess) {}

  setMap(map: MapLibreMap | null): void {
    this.mapRef = map
  }

  getMap(): MapLibreMap | null {
    return this.mapRef
  }

  register(plugin: AeroSpotPlugin): void {
    this.plugins.set(plugin.id, plugin)
  }

  registerAll(plugins: AeroSpotPlugin[]): void {
    for (const plugin of plugins) this.register(plugin)
  }

  list(): AeroSpotPlugin[] {
    return [...this.plugins.values()]
  }

  isActive(id: string): boolean {
    return this.activated.has(id)
  }

  private context(): PluginContext {
    return {
      layers: this.layers,
      spotProviders: this.spotProviders,
      enrichments: this.enrichments,
      panels: this.panels,
      settings: this.settings,
      map: { get: () => this.mapRef },
    }
  }

  async activate(id: string): Promise<void> {
    const plugin = this.plugins.get(id)
    if (!plugin || this.activated.has(id)) return
    await plugin.activate(this.context())
    this.activated.add(id)
  }

  async deactivate(id: string): Promise<void> {
    const plugin = this.plugins.get(id)
    if (!plugin || !this.activated.has(id)) return
    plugin.deactivate?.()
    this.activated.delete(id)
  }

  /** Align active plugins with the persisted enabled list. */
  async sync(): Promise<void> {
    const enabled = new Set(this.settings.enabledIds())
    for (const plugin of this.plugins.values()) {
      if (enabled.has(plugin.id)) {
        await this.activate(plugin.id)
      } else {
        await this.deactivate(plugin.id)
      }
    }
  }
}

let host: PluginHost | null = null

export function createPluginHost(settings: PluginSettingsAccess): PluginHost {
  host = new PluginHost(settings)
  return host
}

export function getPluginHost(): PluginHost {
  if (!host) {
    throw new Error('[AeroSpot] PluginHost non initialisé.')
  }
  return host
}
