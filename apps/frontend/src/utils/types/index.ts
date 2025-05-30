export type Coord = { lat: number; lon: number }

export type Point = { x: number; y: number }

export type LayerStyle = {
  color: string
  strokeWidth?: number
  fontSize?: number
}

export type BrushLayerData = {
  points: Point[]
}

export type LineLayerData = {
  startPoint: Point
  endPoint: Point
}

export type ArrowLayerData = {
  startPoint: Point
  endPoint: Point
}

export type CircleLayerData = {
  center: Point
  radiusX: number
  radiusY: number
}

export type RectangleLayerData = {
  startPoint: Point
  endPoint: Point
}

export type TextLayerData = {
  position: Point
  content: string
}

export type ParkingLayerData = {
  position: Point
}

export type LayerData =
  | { type: 'brush'; data: BrushLayerData }
  | { type: 'line'; data: LineLayerData }
  | { type: 'arrow'; data: ArrowLayerData }
  | { type: 'circle'; data: CircleLayerData }
  | { type: 'rectangle'; data: RectangleLayerData }
  | { type: 'text'; data: TextLayerData }
  | { type: 'parking'; data: ParkingLayerData }

export type PaintLayer = {
  id: string
  visible: boolean
  locked: boolean
  name?: string
  style: LayerStyle
  timestamp: number
} & LayerData

export type Territory = {
  num: string,
  polygon: Coord[],
  name: string,

  // Images originales (jamais modifiées)
  original?: string
  originalLarge?: string

  // Layers de dessin pour chaque format
  paintLayersImage?: PaintLayer[]
  paintLayersLarge?: PaintLayer[]

  // Images finales avec layers appliqués
  image?: string
  large?: string
  miniature?: string

  isDefault: boolean
}

export type TerritoryCache = {
  territories: Territory[]
  gpx: string
  lastUpdate: number
}

/**
 * Résultat de génération d'image
 */
export interface GeneratedImage {
  miniature: string
  image: string
}

/**
 * Configuration pour la génération d'images
 */
export interface ImageGenerationConfig {
  contourColor?: string
  contourWidth?: number
}
