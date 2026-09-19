import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Coordinates, HomeLocation, Spot } from '@/types'
import type { KeyedRegistry } from './registry'

export interface LayerDefinition {
  id: string
  label: string
  description?: string
  /** Lower values render first (below). */
  order?: number
  defaultVisible?: boolean
  legendUrl?: string
  /** Must be idempotent: safe to call again after a style reload. */
  add(map: MapLibreMap): void
  remove(map: MapLibreMap): void
}

export interface SpotProviderParams {
  home: HomeLocation | null
  bbox: [number, number, number, number] | null
  center?: Coordinates
  radiusKm?: number
  signal?: AbortSignal
}

export interface SpotProvider {
  id: string
  label: string
  /** Provider runs automatically when inputs change (vs. user-triggered). */
  auto?: boolean
  fetch(params: SpotProviderParams): Promise<Spot[]>
}

export interface EnrichmentContext {
  home: HomeLocation | null
  signal?: AbortSignal
}

export interface SpotEnrichment {
  id: string
  label: string
  enrich(spots: Spot[], ctx: EnrichmentContext): Promise<void> | void
}

export interface PanelDefinition {
  id: string
  label: string
  icon?: string
  order?: number
}

export interface MapAccess {
  get(): MapLibreMap | null
}

export interface PluginSettingsAccess {
  isEnabled(id: string): boolean
  setEnabled(id: string, value: boolean): void
  enabledIds(): string[]
}

export interface PluginContext {
  layers: KeyedRegistry<LayerDefinition>
  spotProviders: KeyedRegistry<SpotProvider>
  enrichments: KeyedRegistry<SpotEnrichment>
  panels: KeyedRegistry<PanelDefinition>
  settings: PluginSettingsAccess
  map: MapAccess
}

export interface AeroSpotPlugin {
  id: string
  name: string
  version: string
  description?: string
  activate(ctx: PluginContext): void | Promise<void>
  deactivate?(): void
}
