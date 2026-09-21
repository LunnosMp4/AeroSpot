import type { AeroSpotPlugin, PluginContext } from '../types'
import { findCandidates } from '@/services/api/overpass'

export function createOverpassPlugin(): AeroSpotPlugin {
  return {
    id: 'overpass',
    name: 'Découverte OpenStreetMap',
    version: '1.1.0',
    description:
      'Recherche des spots potentiels (friches, ruines, pistes) et des sites de parapente via Overpass.',
    activate(ctx: PluginContext): void {
      ctx.spotProviders.register({
        id: 'overpass',
        label: 'OpenStreetMap',
        auto: false,
        fetch({ center, radiusKm, signal }) {
          if (!center) return Promise.resolve([])
          return findCandidates({
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
