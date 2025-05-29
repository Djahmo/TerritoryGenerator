/**
 * Types pour les opérations de canvas
 */
export interface DrawOptions {
  color?: string
  alpha?: number
  lineWidth?: number
}

export interface MaskOptions extends DrawOptions {
  planLarge: boolean
}

/**
 * Dessine un masque sur le canvas avec une forme polygonale
 */
export const drawMask = (
  ctx: CanvasRenderingContext2D,
  polygon: [number, number][],
  width: number,
  height: number,
  options: MaskOptions
): void => {
  const { planLarge, color = 'grey', alpha = 0.55 } = options

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.beginPath()

  if (planLarge) {
    // Mode plan large : remplissage simple du polygone
    ctx.moveTo(polygon[0][0], polygon[0][1])
    polygon.forEach(([x, y]) => ctx.lineTo(x, y))
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  } else {
    // Mode normal : masque avec découpe (evenodd)
    ctx.rect(0, 0, width, height)
    ctx.moveTo(polygon[0][0], polygon[0][1])
    polygon.forEach(([x, y]) => ctx.lineTo(x, y))
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill('evenodd')
  }

  ctx.globalAlpha = 1
  ctx.restore()
}

/**
 * Dessine le contour d'un polygone
 */
export const drawContour = (
  ctx: CanvasRenderingContext2D,
  polygon: [number, number][],
  options: DrawOptions = {}
): void => {
  const { color = 'red', lineWidth = 8 } = options

  ctx.save()
  ctx.beginPath()

  polygon.forEach(([x, y], i) => {
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })

  ctx.closePath()
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.stroke()
  ctx.restore()
}

/**
 * Applique une rotation à un canvas entier
 */
export const rotateCanvas = (
  ctx: CanvasRenderingContext2D,
  image: ImageBitmap,
  angle: number,
  centerX: number,
  centerY: number
): void => {
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(angle)
  ctx.drawImage(image, -centerX, -centerY)
  ctx.restore()
}

/**
 * Effectue un crop et redimensionnement d'un canvas
 */
export const cropAndResize = (
  sourceCanvas: HTMLCanvasElement,
  sourceRect: { x: number, y: number, width: number, height: number },
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(
    sourceCanvas,
    sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height,
    0, 0, targetWidth, targetHeight
  )

  return canvas
}

/**
 * Retourne un canvas si nécessaire (correction de l'orientation)
 */
export const flipCanvasIfNeeded = (
  canvas: HTMLCanvasElement,
  angle: number
): HTMLCanvasElement => {
  const isUpsideDown = Math.abs(Math.abs(angle) - Math.PI) < Math.PI / 2

  if (!isUpsideDown) {
    return canvas
  }

  const flippedCanvas = document.createElement('canvas')
  flippedCanvas.width = canvas.width
  flippedCanvas.height = canvas.height

  const ctx = flippedCanvas.getContext('2d')!
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(Math.PI)
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2)

  return flippedCanvas
}

/**
 * Configure les paramètres de qualité pour un contexte de canvas
 */
export const setCanvasQuality = (ctx: CanvasRenderingContext2D): void => {
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
}
