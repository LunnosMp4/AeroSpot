import type { Spot } from '@/types'
import { getJSON, sendJSON } from './http'

const BASE = '/api'

export interface BackendHealth {
  ok: boolean
  mode: string
  spots: number
  saved: number
}

export async function isAvailable(): Promise<boolean> {
  try {
    const health = await getJSON<BackendHealth>(`${BASE}/health`, { timeoutMs: 3_000 })
    return health?.ok === true
  } catch {
    return false
  }
}

export async function fetchSpots(): Promise<Spot[]> {
  return (await getJSON<Spot[]>(`${BASE}/spots`, { timeoutMs: 8_000 })) ?? []
}

export async function createSpot(spot: Spot): Promise<void> {
  await sendJSON('POST', `${BASE}/spots`, spot)
}

export async function deleteSpot(id: string): Promise<void> {
  await sendJSON('DELETE', `${BASE}/spots/${encodeURIComponent(id)}`)
}

export async function fetchSaved(): Promise<string[]> {
  return (await getJSON<string[]>(`${BASE}/saved`, { timeoutMs: 8_000 })) ?? []
}

export async function saveSpot(id: string): Promise<void> {
  await sendJSON('POST', `${BASE}/saved`, { id })
}

export async function unsaveSpot(id: string): Promise<void> {
  await sendJSON('DELETE', `${BASE}/saved/${encodeURIComponent(id)}`)
}
