import { createCanvas, loadImage } from 'canvas'
import { setCanvasQuality } from '../utils/canvas.js'

/**
 * Crée une miniature à partir d'une image Canvas
 */
export const createThumbnail = async (
  imageCanvas: any, // Canvas from node-canvas
  cropWidth: number,
  cropHeight: number
): Promise<string> => {
  // Calcul du crop pour maintenir le ratio
  let sx = 0, sy = 0, sWidth = imageCanvas.width, sHeight = imageCanvas.height
  const ratio = imageCanvas.width / imageCanvas.height
  const targetRatio = cropWidth / cropHeight

  if (ratio < targetRatio) {
    sHeight = imageCanvas.width / targetRatio
    sy = (imageCanvas.height - sHeight) / 2
  }

  // Premier canvas : crop avec les dimensions cibles
  const cropCanvas = createCanvas(cropWidth, cropHeight)
  const cropCtx = cropCanvas.getContext('2d')

  setCanvasQuality(cropCtx)
  cropCtx.drawImage(
    imageCanvas,
    sx, sy, sWidth, sHeight,
    0, 0, cropWidth, cropHeight
  )

  // Deuxième canvas : redimensionnement final pour la miniature
  const finalWidth = cropWidth // Utilise directement la largeur demandée
  const finalHeight = Math.round((cropHeight / cropWidth) * finalWidth)

  const smallCanvas = createCanvas(finalWidth, finalHeight)
  const smallCtx = smallCanvas.getContext('2d')

  setCanvasQuality(smallCtx)
  smallCtx.drawImage(
    cropCanvas,
    0, 0, cropWidth, cropHeight,
    0, 0, finalWidth, finalHeight
  )

  return smallCanvas.toDataURL()
}

/**
 * Crée une miniature à partir d'un DataURL
 */
export const createThumbnailFromDataUrl = async (
  dataUrl: string,
  cropWidth: number,
  cropHeight: number
): Promise<string> => {
  try {
    const img = await loadImage(dataUrl)
    return await createThumbnail(img, cropWidth, cropHeight)
  } catch (error) {
    throw new Error(`Erreur lors de la création de la miniature: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
  }
}
