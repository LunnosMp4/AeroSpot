/**
 * Generates `public/spots-fr.json` — a national catalogue of potential FPV
 * spots derived from OpenStreetMap via the Overpass API.
 *
 * Usage: npm run generate:spots
 *
 * The app filters these candidates against the official DGAC restriction layer
 * at runtime, so the bundled file is intentionally a broad superset.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'spots-fr.json')
const FRANCE_URL =
  'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/metropole-version-simplifiee.geojson'
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]
const UA = 'AeroSpotFPV/0.1 (spot catalogue generator)'

const GROUPS = [
  (b) =>
    `nwr["building"="abandoned"](${b});nwr["man_made"="works"]["abandoned"="yes"](${b});nwr["landuse"="industrial"]["abandoned"="yes"](${b});`,
  (b) => `nwr["historic"="ruins"](${b});nwr["leisure"="track"](${b});nwr["sport"="motocross"](${b});`,
  (b) =>
    `nwr["sport"="free_flying"](${b});nwr["sport"="paragliding"](${b});nwr["sport"="hang_gliding"](${b});nwr["free_flying:site"](${b});nwr["free_flying:paragliding"="yes"](${b});`,
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function buildFranceFilter(geometry) {
  const polygons = geometry.coordinates
  const pointInRing = (p, ring) => {
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0]
      const yi = ring[i][1]
      const xj = ring[j][0]
      const yj = ring[j][1]
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) {
        inside = !inside
      }
    }
    return inside
  }
  return (lng, lat) =>
    polygons.some(([outer, ...holes]) => {
      const p = [lng, lat]
      return pointInRing(p, outer) && !holes.some((hole) => pointInRing(p, hole))
    })
}

function buildGrid() {
  const cells = []
  for (let lat = 42.0; lat < 51.5; lat += 2.5) {
    for (let lng = -5.5; lng < 9.5; lng += 2.5) {
      cells.push(`${lat},${lng},${Math.min(lat + 2.5, 51.5)},${Math.min(lng + 2.5, 9.5)}`)
    }
  }
  return cells
}

async function overpass(query) {
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const endpoint of ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': UA,
            Accept: 'application/json',
          },
          body: new URLSearchParams({ data: query }).toString(),
          signal: AbortSignal.timeout(90_000),
        })
        if (!response.ok) continue
        const json = await response.json()
        if (json.remark && !(json.elements?.length > 0)) return { elements: [] }
        return { elements: json.elements ?? [] }
      } catch {
        /* try next endpoint */
      }
      await sleep(2000)
    }
  }
  return { elements: [] }
}

const TAG_KEYS = ['abandoned', 'building', 'historic', 'landuse', 'man_made', 'leisure', 'sport']

function isFreeFlying(tags) {
  const sports = (tags.sport ?? '').split(';').map((value) => value.trim())
  return (
    sports.includes('free_flying') ||
    sports.includes('paragliding') ||
    sports.includes('hang_gliding') ||
    tags['free_flying:site'] != null ||
    tags['free_flying:paragliding'] === 'yes'
  )
}

function defaultName(tags) {
  if (tags.name) return tags.name
  if (isFreeFlying(tags)) {
    const site = tags['free_flying:site']
    if (site === 'takeoff') return 'Décollage parapente'
    if (site === 'landing') return 'Atterrissage parapente'
    if (site === 'towing') return 'Site de treuil'
    if (site === 'training') return 'Pente école parapente'
    return 'Site de parapente'
  }
  if (tags.historic === 'ruins') return 'Ruines'
  if (tags.building === 'abandoned') return 'Bâtiment abandonné'
  if (tags.sport === 'motocross') return 'Terrain de motocross'
  if (tags.leisure === 'track') return 'Piste'
  if (tags.man_made === 'works') return 'Site industriel abandonné'
  return 'Site industriel'
}

function toSpot(element, inFrance) {
  const lat = element.lat ?? element.center?.lat
  const lng = element.lon ?? element.center?.lon
  if (lat == null || lng == null || !inFrance(lng, lat)) return null
  const tags = element.tags ?? {}
  const freeFlying = isFreeFlying(tags)
  const isTrack = tags.sport === 'motocross' || tags.leisure === 'track'
  const name = defaultName(tags)
  const spotTags = ['osm']
  if (freeFlying) {
    spotTags.push('parapente')
    const site = tags['free_flying:site']
    if (site === 'takeoff') spotTags.push('décollage')
    else if (site === 'landing') spotTags.push('atterrissage')
    else if (site) spotTags.push(site)
  } else {
    for (const key of TAG_KEYS) if (tags[key]) spotTags.push(tags[key])
  }
  return {
    id: `osm-${element.type}-${element.id}`,
    name,
    city: tags['addr:city'],
    category:
      name === 'Ruines'
        ? 'ruins'
        : freeFlying
          ? 'paragliding'
          : isTrack
            ? 'race'
            : 'bando',
    tags: [...new Set(spotTags)].slice(0, 5),
    coordinates: { lng: Math.round(lng * 1e6) / 1e6, lat: Math.round(lat * 1e6) / 1e6 },
    altitudeCeilingM: null,
    legalStatus: 'unknown',
    source: 'overpass',
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

async function main() {
  const france = await (await fetch(FRANCE_URL)).json()
  const inFrance = buildFranceFilter(france.geometry)
  const cells = buildGrid()
  const spots = []
  const seen = new Set()

  console.log(`Generating spot catalogue from ${cells.length} cells…`)
  for (let i = 0; i < cells.length; i++) {
    const bbox = cells[i]
    let added = 0
    for (const group of GROUPS) {
      const result = await overpass(`[out:json][timeout:80];(${group(bbox)});out center 1200;`)
      for (const element of result.elements) {
        const spot = toSpot(element, inFrance)
        if (!spot || seen.has(spot.id)) continue
        seen.add(spot.id)
        spots.push(spot)
        added++
      }
      await sleep(1000)
    }
    mkdirSync(join(ROOT, 'public'), { recursive: true })
    writeFileSync(OUT, JSON.stringify(spots))
    console.log(`[${i + 1}/${cells.length}] ${bbox} -> +${added} (total ${spots.length})`)
    await sleep(800)
  }
  console.log(`Done: ${spots.length} spots written to ${OUT}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
