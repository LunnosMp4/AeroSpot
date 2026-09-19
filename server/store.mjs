import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * Tiny JSON-backed store shared by every client that connects to the server.
 * Writes are debounced and atomic (temp file + rename) to survive power loss
 * on a Raspberry Pi.
 */
export function createStore(dataFile) {
  mkdirSync(dirname(dataFile), { recursive: true })

  let state = { spots: {}, saved: [] }

  if (existsSync(dataFile)) {
    try {
      const parsed = JSON.parse(readFileSync(dataFile, 'utf8'))
      state.spots = parsed.spots && typeof parsed.spots === 'object' ? parsed.spots : {}
      state.saved = Array.isArray(parsed.saved) ? parsed.saved : []
    } catch (error) {
      console.warn(`[store] ${dataFile} illisible (${error.message}), réinitialisation.`)
    }
  }

  let timer = null

  function flush() {
    timer = null
    const temp = `${dataFile}.tmp`
    writeFileSync(temp, JSON.stringify(state, null, 2))
    renameSync(temp, dataFile)
  }

  function schedule() {
    if (timer) return
    timer = setTimeout(flush, 150)
  }

  return {
    stats() {
      return { spots: Object.keys(state.spots).length, saved: state.saved.length }
    },
    listSpots() {
      return Object.values(state.spots)
    },
    upsertSpot(spot) {
      state.spots[spot.id] = spot
      schedule()
      return spot
    },
    removeSpot(id) {
      const existed = Boolean(state.spots[id])
      delete state.spots[id]
      schedule()
      return existed
    },
    listSaved() {
      return [...state.saved]
    },
    addSaved(id) {
      if (!state.saved.includes(id)) {
        state.saved.push(id)
        schedule()
      }
    },
    removeSaved(id) {
      const index = state.saved.indexOf(id)
      if (index >= 0) {
        state.saved.splice(index, 1)
        schedule()
      }
    },
    flush,
  }
}
