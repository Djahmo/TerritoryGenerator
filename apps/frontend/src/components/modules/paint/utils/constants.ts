import { Brush, SquareParking, Compass, Spline, Type, Square, Circle, ArrowRight, Move } from "lucide-react"
import type { Tool } from "./types"

// Colors
export const PARKING_COLOR = "rgba(0,126,255,1)"

// Zoom and drawing constraints
export const MAX_ZOOM = 10
export const ZOOM_FACTOR = 1.1
export const MIN_STROKE_WIDTH = 1
export const MAX_STROKE_WIDTH = 40

// Tools configuration
export const TOOLS: Tool[] = [
  { name: 'selection', label: 'Sélection', icon: Move },
  { name: 'brush', label: 'Pinceau', icon: Brush },
  { name: 'line', label: 'Ligne droite', icon: Spline },
  { name: 'arrow', label: 'Flèche', icon: ArrowRight },
  { name: 'rectangle', label: 'Rectangle', icon: Square },
  { name: 'circle', label: 'Cercle', icon: Circle },
  { name: 'text', label: 'Texte', icon: Type },
  { name: 'parking', label: 'Parking', icon: SquareParking },
  { name: 'compass', label: 'Rose des vents', icon: Compass }
] as const
