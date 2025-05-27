export type Coord = { lat: number; lon: number }
export type Territory = {
  num: string,
  polygon: Coord[],
  name: string,
  miniature?: string,
  image?: string,
  large?: string
  isDefault: boolean
}
export type TerritoryCache = {
  territories: Territory[]
  gpx: string
  lastUpdate: number
}
