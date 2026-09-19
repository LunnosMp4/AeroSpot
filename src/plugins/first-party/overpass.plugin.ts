import type { AeroSpotPlugin, PluginContext } from '../types'
import { findFpvCandidates } from '@/services/api/overpass'

export function createOverpassPlugin(): AeroSpotPlugin {
  return {
    id: 'overpass',
    name: 'Découverte OpenStreetMap',
    version: '1.0.0',
    description: 'Recherche des spots potentiels (friches, ruines, pistes) via Overpass.',
    activate(ctx: PluginContext): void {
      ctx.spotProviders.register({
        id: 'overpass',
        label: 'OpenStreetMap',
        auto: false,
        fetch({ center, radiusKm, signal }) {
          if (!center) return Promise.resolve([])
          return findFpvCandidates({
            center,
            radiusKm: radiusKm ?? 25,
            limit: 500,
            signal,
          })
        },
      })
    },
  }
}
