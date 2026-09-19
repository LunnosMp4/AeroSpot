const env = import.meta.env

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const CONFIG = {
  banApi: env.VITE_BAN_API ?? 'https://api-adresse.data.gouv.fr',
  osrmApi: env.VITE_OSRM_API ?? 'https://router.project-osrm.org',
  ignWms: env.VITE_IGN_WMS ?? 'https://data.geopf.fr/wms-r/wms',
  ignWfs: env.VITE_IGN_WFS ?? 'https://data.geopf.fr/wfs/ows',
  ignIsochrone: env.VITE_IGN_ISOCHRONE ?? 'https://data.geopf.fr/navigation/isochrone',
  overpassEndpoints: (
    env.VITE_OVERPASS_API ??
    'https://overpass-api.de/api/interpreter,https://overpass.kumi.systems/api/interpreter'
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  defaultCenter: {
    lng: num(env.VITE_DEFAULT_CENTER_LNG, 2.3522),
    lat: num(env.VITE_DEFAULT_CENTER_LAT, 48.8566),
  },
  defaultZoom: num(env.VITE_DEFAULT_ZOOM, 6),
} as const

export const DATASETS = {
  droneRestrictionsWmsLayer: 'TRANSPORTS.DRONES.RESTRICTIONS',
  droneRestrictionsWfsType:
    'TRANSPORTS.DRONES.RESTRICTIONS:carte_restriction_drones_lf',
  droneLegend:
    'https://data.geopf.fr/annexes/ressources/legendes/TRANSPORTS.DRONES.RESTRICTIONS-legend.png',
} as const
