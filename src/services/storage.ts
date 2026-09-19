const PREFIX = 'aerospot'

export const STORAGE_KEYS = {
  home: `${PREFIX}.home.v1`,
  userSpots: `${PREFIX}.spots.user.v1`,
  saved: `${PREFIX}.saved.v1`,
  filters: `${PREFIX}.filters.v1`,
  plugins: `${PREFIX}.plugins.v1`,
  settings: `${PREFIX}.settings.v1`,
  routesCache: `${PREFIX}.routes.cache.v1`,
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    const probe = `${PREFIX}.probe`
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

export function readJSON<T>(key: StorageKey, fallback: T): T {
  const store = safeStorage()
  if (!store) return fallback
  try {
    const raw = store.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJSON<T>(key: StorageKey, value: T): void {
  const store = safeStorage()
  if (!store) return
  try {
    store.setItem(key, JSON.stringify(value))
  } catch {
    /* quota exceeded or unavailable */
  }
}

export function removeJSON(key: StorageKey): void {
  const store = safeStorage()
  if (!store) return
  try {
    store.removeItem(key)
  } catch {
    /* noop */
  }
}
