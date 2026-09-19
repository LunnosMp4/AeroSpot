import type { AeroSpotPlugin } from '../types'
import { createAirspacePlugin } from './airspace.plugin'
import { createIsochronePlugin } from './isochrone.plugin'
import { createOverpassPlugin } from './overpass.plugin'

export const firstPartyPlugins: AeroSpotPlugin[] = [
  createAirspacePlugin(),
  createIsochronePlugin(),
  createOverpassPlugin(),
]

export function getDefaultPluginIds(): string[] {
  return firstPartyPlugins.map((plugin) => plugin.id)
}
