import type { Coordinates } from './spot'

export interface HomeLocation {
  coordinates: Coordinates
  label: string
  postcode?: string
  citycode?: string
  context?: string
  setAt: string
}

export interface TravelMatrix {
  homeIndex: number
  durationsSec: (number | null)[]
  distancesM: (number | null)[]
}
