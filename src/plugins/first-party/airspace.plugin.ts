import type { Map as MapLibreMap } from 'maplibre-gl'
import type { AeroSpotPlugin, PluginContext } from '../types'
import { CONFIG, DATASETS } from '@/services/config'

const SOURCE_ID = 'aerospot-airspace'
const LAYER_ID = 'aerospot-airspace-layer'

const WMS_TILE_URL =
  `${CONFIG.ignWms}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap` +
  `&LAYERS=${DATASETS.droneRestrictionsWmsLayer}&STYLES=normal&FORMAT=image/png` +
  `&TRANSPARENT=true&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256`

export function createAirspacePlugin(): AeroSpotPlugin {
  return {
    id: 'airspace',
    name: 'Restrictions DGAC',
    version: '1.0.0',
    description: 'Zones de restriction drone officielles (IGN Géoplateforme).',
    activate(ctx: PluginContext): void {
      ctx.layers.register({
        id: 'airspace',
        label: 'Restrictions drone',
        description: 'Zones DGAC — catégorie ouverte et aéromodélisme.',
        order: 10,
        defaultVisible: true,
        legendUrl: DATASETS.droneLegend,
        add(map: MapLibreMap) {
          if (!map.getSource(SOURCE_ID)) {
            map.addSource(SOURCE_ID, {
              type: 'raster',
              tiles: [WMS_TILE_URL],
              tileSize: 256,
              attribution: 'DGAC · IGN Géoplateforme',
            })
          }
          if (!map.getLayer(LAYER_ID)) {
            map.addLayer({
              id: LAYER_ID,
              type: 'raster',
              source: SOURCE_ID,
              paint: { 'raster-opacity': 0.62, 'raster-fade-duration': 0 },
            })
          }
        },
        remove(map: MapLibreMap) {
          if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
          if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
        },
      })
    },
  }
}
