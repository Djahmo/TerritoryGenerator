export interface Coord {
  lat: number
  lon: number
}

export interface Territory {
  num: string
  polygon: Coord[]
  name: string
  rotation?: number
  currentBboxLarge?: [number, number, number, number]
}

export interface GeneratedImage {
  miniature: string
  image: string
}

export interface ImageGenerationConfig {
  contourColor?: string
  contourWidth?: number
}
