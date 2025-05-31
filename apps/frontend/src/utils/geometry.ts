import type { Coord } from "%/types"

/**
 * Calcule l'enveloppe convexe d'un ensemble de points en 2D
 * Utilise l'algorithme de Andrew (variante de Graham scan)
 */
export const convexHull = (points: [number, number][]): [number, number][] => {
  if (points.length < 3) return points

  const cross = ([x0, y0]: number[], [x1, y1]: number[], [x2, y2]: number[]) =>
    (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0)

  const sortedPoints = points.slice().sort(([x1, y1], [x2, y2]) => x1 - x2 || y1 - y2)

  // Construction de la partie inférieure
  const lower: [number, number][] = []
  for (const p of sortedPoints) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop()
    }
    lower.push(p)
  }

  // Construction de la partie supérieure
  const upper: [number, number][] = []
  for (let i = sortedPoints.length - 1; i >= 0; i--) {
    const p = sortedPoints[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop()
    }
    upper.push(p)
  }

  // Suppression des points dupliqués
  upper.pop()
  lower.pop()

  return lower.concat(upper)
}

/**
 * Applique une rotation à un point autour d'un centre
 */
export const rotatePoint = (
  [x, y]: [number, number],
  angle: number,
  cx: number,
  cy: number
): [number, number] => {
  const dx = x - cx
  const dy = y - cy
  return [
    dx * Math.cos(angle) - dy * Math.sin(angle) + cx,
    dx * Math.sin(angle) + dy * Math.cos(angle) + cy
  ]
}

/**
 * Convertit des coordonnées GPS en coordonnées pixel
 */
export const gpsToPixel = (
  lat: number,
  lon: number,
  bbox: number[],
  canvasSize: number
): [number, number] => {
  const [minLon, minLat, maxLon, maxLat] = bbox
  const x = ((lon - minLon) / (maxLon - minLon)) * canvasSize
  const y = ((maxLat - lat) / (maxLat - minLat)) * canvasSize
  return [x, y]
}

/**
 * Calcule la bounding box d'un polygone avec redimensionnement intelligent
 */
export const calculateBoundingBox = (
  polygon: Coord[],
  planLarge: boolean,
  config: { ppp: number, largeFactor: number },
  PHI: number
): [number, number, number, number] => {
  const lats = polygon.map(p => p.lat)
  const lons = polygon.map(p => p.lon)

  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)

  const diag = Math.hypot(maxLat - minLat, maxLon - minLon)
  const centerLat = (minLat + maxLat) / 2
  const centerLon = (minLon + maxLon) / 2
  let size: number

  if (planLarge) {
    size = diag / config.largeFactor
  } else {
    const factor = (200 / config.ppp) * 1.2
    const minSize = 0.01618 / factor // Nombre d'or pour taille minimale

    if (diag < 0.01 / factor) {
      size = minSize
    } else {
      size = Math.round(diag * PHI * 100000) / 100000
    }
  }

  return [
    centerLon - size / 2,
    centerLat - size / 2,
    centerLon + size / 2,
    centerLat + size / 2
  ]
}

/**
 * Trouve l'orientation optimale d'un polygone pour maximiser l'espace utilisé
 */
export const findOptimalOrientation = (
  hull: [number, number][],
  canvasSize: number,
  targetWidth: number,
  targetHeight: number
) => {
  let best = {
    scale: -Infinity,
    angle: 0,
    center: [0, 0] as [number, number],
    hull: [] as [number, number][]
  }

  // Test de différentes orientations basées sur les arêtes du convex hull
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i]
    const b = hull[(i + 1) % hull.length]
    const testAngle = -Math.atan2(b[1] - a[1], b[0] - a[0])

    const cx = canvasSize / 2
    const cy = canvasSize / 2
    const hullRotated = hull.map(pt => rotatePoint(pt, testAngle, cx, cy))

    const xs = hullRotated.map(p => p[0])
    const ys = hullRotated.map(p => p[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    const w = maxX - minX
    const h = maxY - minY
    const scale = Math.min(targetWidth / w, targetHeight / h)

    if (scale > best.scale) {
      best = {
        scale,
        angle: testAngle,
        center: [(minX + maxX) / 2, (minY + maxY) / 2],
        hull: hullRotated
      }
    }
  }

  return best
}
