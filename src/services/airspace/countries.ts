import type { Coordinates } from '@/types'

export interface CountryBounds {
  code: string
  name: string
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

/**
 * Rough country bounding boxes (Europe focus) used to route airspace queries
 * to the OpenAIP provider and to decide which countries to load for a viewport.
 * France is intentionally excluded — it is served by the IGN drone layer.
 * Values are approximate; a point near a border may resolve to a neighbour.
 */
export const OPEN_AIP_COUNTRIES: CountryBounds[] = [
  { code: 'AL', name: 'Albanie', minLng: 19.3, minLat: 39.6, maxLng: 21.1, maxLat: 42.7 },
  { code: 'AD', name: 'Andorre', minLng: 1.4, minLat: 42.4, maxLng: 1.8, maxLat: 42.7 },
  { code: 'AT', name: 'Autriche', minLng: 9.5, minLat: 46.4, maxLng: 17.2, maxLat: 49.0 },
  { code: 'BE', name: 'Belgique', minLng: 2.5, minLat: 49.5, maxLng: 6.4, maxLat: 51.5 },
  { code: 'BA', name: 'Bosnie', minLng: 15.7, minLat: 42.6, maxLng: 19.6, maxLat: 45.3 },
  { code: 'BG', name: 'Bulgarie', minLng: 22.4, minLat: 41.2, maxLng: 28.6, maxLat: 44.2 },
  { code: 'HR', name: 'Croatie', minLng: 13.5, minLat: 42.4, maxLng: 19.4, maxLat: 46.5 },
  { code: 'CY', name: 'Chypre', minLng: 32.3, minLat: 34.6, maxLng: 34.6, maxLat: 35.7 },
  { code: 'CZ', name: 'Tchéquie', minLng: 12.1, minLat: 48.6, maxLng: 18.9, maxLat: 51.1 },
  { code: 'DK', name: 'Danemark', minLng: 8.1, minLat: 54.6, maxLng: 15.2, maxLat: 57.8 },
  { code: 'EE', name: 'Estonie', minLng: 21.8, minLat: 57.5, maxLng: 28.2, maxLat: 59.7 },
  { code: 'FI', name: 'Finlande', minLng: 20.6, minLat: 59.8, maxLng: 31.6, maxLat: 70.1 },
  { code: 'DE', name: 'Allemagne', minLng: 5.9, minLat: 47.3, maxLng: 15.0, maxLat: 55.1 },
  { code: 'GR', name: 'Grèce', minLng: 19.4, minLat: 34.8, maxLng: 28.3, maxLat: 41.7 },
  { code: 'HU', name: 'Hongrie', minLng: 16.1, minLat: 45.7, maxLng: 22.9, maxLat: 48.6 },
  { code: 'IS', name: 'Islande', minLng: -24.5, minLat: 63.4, maxLng: -13.5, maxLat: 66.6 },
  { code: 'IE', name: 'Irlande', minLng: -10.5, minLat: 51.4, maxLng: -6.0, maxLat: 55.4 },
  { code: 'IT', name: 'Italie', minLng: 6.6, minLat: 36.6, maxLng: 18.5, maxLat: 47.1 },
  { code: 'LV', name: 'Lettonie', minLng: 21.0, minLat: 55.7, maxLng: 28.2, maxLat: 58.1 },
  { code: 'LI', name: 'Liechtenstein', minLng: 9.5, minLat: 47.0, maxLng: 9.6, maxLat: 47.3 },
  { code: 'LT', name: 'Lituanie', minLng: 21.0, minLat: 53.9, maxLng: 26.8, maxLat: 56.5 },
  { code: 'LU', name: 'Luxembourg', minLng: 5.7, minLat: 49.4, maxLng: 6.5, maxLat: 50.2 },
  { code: 'MT', name: 'Malte', minLng: 14.2, minLat: 35.8, maxLng: 14.6, maxLat: 36.1 },
  { code: 'MC', name: 'Monaco', minLng: 7.4, minLat: 43.7, maxLng: 7.5, maxLat: 43.8 },
  { code: 'ME', name: 'Monténégro', minLng: 18.4, minLat: 41.9, maxLng: 20.4, maxLat: 43.6 },
  { code: 'NL', name: 'Pays-Bas', minLng: 3.4, minLat: 50.8, maxLng: 7.2, maxLat: 53.5 },
  { code: 'MK', name: 'Macédoine du Nord', minLng: 20.5, minLat: 40.9, maxLng: 23.0, maxLat: 42.4 },
  { code: 'NO', name: 'Norvège', minLng: 4.6, minLat: 58.0, maxLng: 31.1, maxLat: 71.2 },
  { code: 'PL', name: 'Pologne', minLng: 14.1, minLat: 49.0, maxLng: 24.2, maxLat: 54.8 },
  { code: 'PT', name: 'Portugal', minLng: -9.5, minLat: 37.0, maxLng: -6.2, maxLat: 42.2 },
  { code: 'RO', name: 'Roumanie', minLng: 20.3, minLat: 43.6, maxLng: 29.7, maxLat: 48.3 },
  { code: 'RS', name: 'Serbie', minLng: 18.8, minLat: 42.2, maxLng: 23.0, maxLat: 46.2 },
  { code: 'SK', name: 'Slovaquie', minLng: 16.8, minLat: 47.7, maxLng: 22.6, maxLat: 49.6 },
  { code: 'SI', name: 'Slovénie', minLng: 13.4, minLat: 45.4, maxLng: 16.6, maxLat: 46.9 },
  { code: 'ES', name: 'Espagne', minLng: -9.3, minLat: 36.0, maxLng: 3.3, maxLat: 43.8 },
  { code: 'SE', name: 'Suède', minLng: 11.1, minLat: 55.3, maxLng: 24.2, maxLat: 69.1 },
  { code: 'CH', name: 'Suisse', minLng: 5.96, minLat: 45.8, maxLng: 10.5, maxLat: 47.8 },
  { code: 'GB', name: 'Royaume-Uni', minLng: -8.6, minLat: 49.9, maxLng: 1.8, maxLat: 58.7 },
  { code: 'TR', name: 'Turquie', minLng: 26.0, minLat: 36.0, maxLng: 44.8, maxLat: 42.0 },
]

function inBounds(c: Coordinates, bounds: CountryBounds): boolean {
  return (
    c.lng >= bounds.minLng &&
    c.lng <= bounds.maxLng &&
    c.lat >= bounds.minLat &&
    c.lat <= bounds.maxLat
  )
}

/** Returns the OpenAIP country containing a point, or null (e.g. France / ocean). */
export function countryForPoint(c: Coordinates): CountryBounds | null {
  for (const country of OPEN_AIP_COUNTRIES) {
    if (inBounds(c, country)) return country
  }
  return null
}

export function countriesIntersectingBBox(
  bbox: [number, number, number, number],
): CountryBounds[] {
  const [minLng, minLat, maxLng, maxLat] = bbox
  return OPEN_AIP_COUNTRIES.filter(
    (c) =>
      c.minLng <= maxLng && c.maxLng >= minLng && c.minLat <= maxLat && c.maxLat >= minLat,
  )
}
