import { setCanvasQuality } from '../utils/canvas'

/**
 * Crée une miniature à partir d'une image source
 */
export const createThumbnail = (
  src: string,
  cropWidth: number,
  cropHeight: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      try {
        const thumbnailDataUrl = processImageToThumbnail(img, cropWidth, cropHeight)
        resolve(thumbnailDataUrl)
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => reject(new Error('Erreur lors du chargement de l\'image'))
    img.src = src
  })
}

/**
 * Traite une image pour créer une miniature avec crop et redimensionnement
 */
const processImageToThumbnail = (
  img: HTMLImageElement,
  cropWidth: number,
  cropHeight: number
): string => {
  // Calcul du crop pour maintenir le ratio
  let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height
  const ratio = img.width / img.height
  const targetRatio = cropWidth / cropHeight

  if (ratio < targetRatio) {
    sHeight = img.width / targetRatio
    sy = (img.height - sHeight) / 2
  }

  // Premier canvas : crop avec les dimensions cibles
  const cropCanvas = document.createElement("canvas")
  cropCanvas.width = cropWidth
  cropCanvas.height = cropHeight
  const cropCtx = cropCanvas.getContext("2d")!

  setCanvasQuality(cropCtx)
  cropCtx.drawImage(
    img,
    sx, sy, sWidth, sHeight,
    0, 0, cropWidth, cropHeight
  )  // Deuxième canvas : redimensionnement final pour la miniature
  const finalWidth = cropWidth // Utilise directement la largeur demandée
  const finalHeight = Math.round((cropHeight / cropWidth) * finalWidth)

  const smallCanvas = document.createElement("canvas")
  smallCanvas.width = finalWidth
  smallCanvas.height = finalHeight
  const smallCtx = smallCanvas.getContext("2d")!

  setCanvasQuality(smallCtx)
  smallCtx.drawImage(
    cropCanvas,
    0, 0, cropWidth, cropHeight,
    0, 0, finalWidth, finalHeight
  )

  return smallCanvas.toDataURL("image/png")
}

/**
 * Charge une image par défaut comme miniature
 */
export const loadDefaultThumbnail = async (
  imagePath: string,
  width: number,
  height: number
): Promise<string> => {
  try {
    return await createThumbnail(imagePath, width, height)
  } catch (error) {
    throw new Error(`Impossible de charger l'image par défaut: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
  }
}
