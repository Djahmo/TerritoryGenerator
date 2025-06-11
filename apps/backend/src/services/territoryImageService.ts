import { createCanvas, loadImage, Canvas, Image } from 'canvas'
import type { Territory, GeneratedImage, ImageGenerationConfig } from '../types/territory.js'
import {
  calculateBoundingBox,
  convexHull,
  gpsToPixel,
  findOptimalOrientation,
  rotatePoint
} from '../utils/geometry.js'
import {
  drawMask,
  drawContour,
  rotateCanvas,
  cropAndResize,
  flipCanvasIfNeeded,
  setCanvasQuality
} from '../utils/canvas.js'
import { loadImageBuffer, buildIgnUrl } from '../utils/network.js'
import { createThumbnail, createThumbnailFromDataUrl } from './thumbnailService.js'

// Queue pour espacer les requêtes WMS
class RequestQueue {
  private queue: Array<() => Promise<any>> = []
  private processing = false
  private lastRequestTime = 0
  private readonly minDelay = 1500 // 1.5 seconde entre chaque requête WMS

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return

    this.processing = true

    while (this.queue.length > 0) {
      const now = Date.now()
      const timeSinceLastRequest = now - this.lastRequestTime

      if (timeSinceLastRequest < this.minDelay) {
        await new Promise(resolve => setTimeout(resolve, this.minDelay - timeSinceLastRequest))
      }

      const request = this.queue.shift()!
      this.lastRequestTime = Date.now()
      await request()
    }

    this.processing = false
  }
}

const wmsQueue = new RequestQueue()

/**
 * Service principal pour la génération d'images de territoires côté backend
 */
export class TerritoryImageService {
  constructor(
    private config: { ppp: number, largeFactor: number },
    private dimensions: {
      finalWidth: number
      finalHeight: number
      rawSize: number
      // Ajouter les dimensions pour les plans larges
      largeFinalWidth?: number
      largeFinalHeight?: number
      largeRawSize?: number
    },
    private PHI: number,
    private userConfig: {
      contourColor: string
      contourWidth: number
      thumbnailWidth: number
      ignApiBaseUrl: string
      ignApiLayer: string
      ignApiFormat: string
      ignApiCRS: string
      networkRetries: number
      networkDelay: number
      ignApiRateLimit: number
    }
  ) {}

  /**
   * Génère une image normale (avec optimisation d'orientation)
   */
  async generateStandardImage(
    territory: Territory,
    options: ImageGenerationConfig = {}
  ): Promise<GeneratedImage> {
    const { contourColor, contourWidth } = {
      contourColor: this.userConfig.contourColor,
      contourWidth: this.userConfig.contourWidth,
      ...options
    }

    // 1. Calcul de la bounding box
    const bbox = calculateBoundingBox(territory.polygon, false, this.config, this.PHI)

    // 2. Chargement de l'image de la carte
    const url = buildIgnUrl(bbox, this.dimensions.rawSize, {
      baseUrl: this.userConfig.ignApiBaseUrl,
      layer: this.userConfig.ignApiLayer,
      format: this.userConfig.ignApiFormat,
      crs: this.userConfig.ignApiCRS
    })

    const imageBuffer = await wmsQueue.add(() => loadImageBuffer(
      url,
      this.userConfig.networkRetries,
      this.userConfig.networkDelay
    ))
    const mapImage = await loadImage(imageBuffer)

    // 3. Conversion du polygone en pixels
    const polygonPixels = territory.polygon.map(coord =>
      gpsToPixel(coord.lat, coord.lon, bbox, this.dimensions.rawSize)
    )

    // 4. Calcul de l'orientation optimale
    const hull = convexHull(polygonPixels)
    const optimal = findOptimalOrientation(
      hull,
      this.dimensions.rawSize,
      this.dimensions.finalWidth,
      this.dimensions.finalHeight
    )

    // Sauvegarder l'angle d'orientation dans l'objet territoire
    territory.rotation = optimal.angle

    // 5. Création du canvas de base avec rotation
    const baseCanvas = this.createRotatedCanvas(mapImage, optimal.angle)

    // 6. Calcul des paramètres de crop
    const cropParams = this.calculateCropParameters(optimal)

    // 7. Crop et redimensionnement
    const croppedCanvas = cropAndResize(
      baseCanvas,
      cropParams,
      this.dimensions.finalWidth,
      this.dimensions.finalHeight
    )

    // 8. Transformation du polygone final
    const finalPolygon = this.transformPolygonToFinalCanvas(
      polygonPixels,
      optimal.angle,
      cropParams
    )

    // 9. Ajout du masque et du contour
    const ctx = croppedCanvas.getContext('2d')
    drawMask(ctx, finalPolygon, this.dimensions.finalWidth, this.dimensions.finalHeight, {
      planLarge: false
    })
    drawContour(ctx, finalPolygon, { color: contourColor, lineWidth: contourWidth })

    // 10. Correction de l'orientation si nécessaire
    const finalCanvas = flipCanvasIfNeeded(croppedCanvas, optimal.angle)

    // 11. Génération de l'image et de la miniature
    const image = finalCanvas.toDataURL()
    const minHeight = Math.round(this.dimensions.finalHeight / this.dimensions.finalWidth * this.userConfig.thumbnailWidth)
    const miniature = await createThumbnailFromDataUrl(image, this.userConfig.thumbnailWidth, minHeight)

    return { image, miniature }
  }
  /**
   * Génère une image large (sans optimisation d'orientation)
   * ⚠️ RETOURNE L'IMAGE BRUTE DE L'API IGN SANS REDIMENSIONNEMENT (ex: 4730x4730)
   */
  async generateLargeImage(
    territory: Territory,
    options: ImageGenerationConfig = {}
  ): Promise<{ dataUrl: string, width: number, height: number, bbox: [number, number, number, number] }> {
    const { contourColor, contourWidth } = {
      contourColor: this.userConfig.contourColor,
      contourWidth: this.userConfig.contourWidth,
      ...options
    }

    // 1. Calcul de la bounding box pour plan large
    const bbox = calculateBoundingBox(territory.polygon, true, this.config, this.PHI)

    // 2. Chargement de l'image brute de l'API IGN
    const rawSize = this.dimensions.largeRawSize || this.dimensions.rawSize
    const url = buildIgnUrl(bbox, rawSize, {
      baseUrl: this.userConfig.ignApiBaseUrl,
      layer: this.userConfig.ignApiLayer,
      format: this.userConfig.ignApiFormat,
      crs: this.userConfig.ignApiCRS
    })

    const imageBuffer = await wmsQueue.add(() => loadImageBuffer(
      url,
      this.userConfig.networkRetries,
      this.userConfig.networkDelay
    ))
    const mapImage = await loadImage(imageBuffer)

    // 3. Création du canvas avec la taille BRUTE (pas de redimensionnement)
    const canvas = createCanvas(rawSize, rawSize)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(mapImage, 0, 0)

    // 4. Transformation du polygone directement sur l'image brute
    const polygonPixels = territory.polygon.map(coord =>
      gpsToPixel(coord.lat, coord.lon, bbox, rawSize)
    )

    // 5. Ajout du masque et du contour sur l'image brute
    drawMask(ctx, polygonPixels, rawSize, rawSize, {
      planLarge: true
    })
    drawContour(ctx, polygonPixels, { color: contourColor, lineWidth: contourWidth })

    // 6. Retourner l'image brute avec ses dimensions originales
    return {
      dataUrl: canvas.toDataURL(),
      width: rawSize,
      height: rawSize,
      bbox
    }
  }  /**
   * Génère une image large avec un bbox personnalisé (utilisé après cropping)
   * ⚠️ SIMPLE : UTILISE EXACTEMENT LE BBOX DU CROP, POINT BARRE
   */  async generateLargeImageWithCustomBbox(
    territory: Territory,
    customBbox: [number, number, number, number],
    options: ImageGenerationConfig = {},
    cropData?: {
      x: number;
      y: number;
      width: number;
      height: number;
      imageWidth: number;
      imageHeight: number;
    }
  ): Promise<{ dataUrl: string, width: number, height: number }> {
    const { contourColor, contourWidth } = {
      contourColor: this.userConfig.contourColor,
      contourWidth: this.userConfig.contourWidth,
      ...options
    }

    // Le bbox fourni est déjà le bbox final calculé dans l'endpoint
    const bbox = customBbox    // Calculer les dimensions finales basées sur la config ET l'orientation du crop
    const [minLon, minLat, maxLon, maxLat] = bbox
    const bboxWidth = maxLon - minLon
    const bboxHeight = maxLat - minLat
    const bboxRatio = bboxWidth / bboxHeight

    // UTILISER LES DIMENSIONS EXACTES DE LA CONFIG LARGE
    const configWidth = this.dimensions.largeFinalWidth || this.dimensions.finalWidth
    const configHeight = this.dimensions.largeFinalHeight || this.dimensions.finalHeight
    const configRatio = configWidth / configHeight

    let finalWidth: number
    let finalHeight: number

    // Si le ratio du bbox correspond au ratio de la config → orientation normale
    // Si le ratio du bbox correspond au ratio inversé de la config → orientation inversée
    if (Math.abs(bboxRatio - configRatio) < Math.abs(bboxRatio - (1/configRatio))) {
      // Orientation normale
      finalWidth = configWidth
      finalHeight = configHeight
    } else {
      // Orientation inversée (crop avec flip)
      finalWidth = configHeight
      finalHeight = configWidth
    }// IMPORTANT : Ajouter une marge PHI autour du bbox final pour obtenir le bon layer IGN
    // (même logique que pour les plans standards)
    const marginFactor = this.PHI // Utiliser PHI directement comme dans calculateBoundingBox
    const lonMargin = bboxWidth * marginFactor
    const latMargin = bboxHeight * marginFactor

    const expandedBbox: [number, number, number, number] = [
      minLon - lonMargin,
      minLat - latMargin,
      maxLon + lonMargin,
      maxLat + latMargin
    ]

    // Télécharger l'image IGN avec le bbox étendu
    const rawSize = this.dimensions.largeRawSize || this.dimensions.rawSize
    const url = buildIgnUrl(expandedBbox, rawSize, {
      baseUrl: this.userConfig.ignApiBaseUrl,
      layer: this.userConfig.ignApiLayer,
      format: this.userConfig.ignApiFormat,
      crs: this.userConfig.ignApiCRS
    })

    const imageBuffer = await wmsQueue.add(() => loadImageBuffer(
      url,
      this.userConfig.networkRetries,
      this.userConfig.networkDelay
    ))
    const mapImage = await loadImage(imageBuffer)

    // Créer le canvas à partir de l'image IGN étendue
    const baseCanvas = createCanvas(rawSize, rawSize)
    const ctx = baseCanvas.getContext('2d')
    ctx.drawImage(mapImage, 0, 0)

    // Calculer les coordonnées du crop dans l'image étendue
    const expandedWidth = expandedBbox[2] - expandedBbox[0]
    const expandedHeight = expandedBbox[3] - expandedBbox[1]

    // Position du bbox final dans l'image étendue
    const cropX = ((minLon - expandedBbox[0]) / expandedWidth) * rawSize
    const cropY = ((expandedBbox[3] - maxLat) / expandedHeight) * rawSize
    const cropWidth = (bboxWidth / expandedWidth) * rawSize
    const cropHeight = (bboxHeight / expandedHeight) * rawSize

    // Cropper et redimensionner pour obtenir l'image finale
    const finalCanvas = cropAndResize(
      baseCanvas,
      { x: cropX, y: cropY, width: cropWidth, height: cropHeight },
      finalWidth,
      finalHeight    )

    // Transformer le polygone pour qu'il corresponde au canvas final
    const polygonPixels = territory.polygon.map(coord => {
      const x = ((coord.lon - minLon) / bboxWidth) * finalWidth
      const y = ((maxLat - coord.lat) / bboxHeight) * finalHeight
      return [x, y] as [number, number]
    })

    // Ajouter le masque et le contour
    const finalCtx = finalCanvas.getContext('2d')
    drawMask(finalCtx, polygonPixels, finalWidth, finalHeight, {
      planLarge: true
    })
    drawContour(finalCtx, polygonPixels, { color: contourColor, lineWidth: contourWidth })

    return {
      dataUrl: finalCanvas.toDataURL(),
      width: finalWidth,
      height: finalHeight
    }
  }

  /**
   * Génère une miniature à partir d'une image existante
   */
  async generateThumbnailFromImage(imageDataUrl: string): Promise<string> {
    const minHeight = Math.round(this.dimensions.finalHeight / this.dimensions.finalWidth * this.userConfig.thumbnailWidth)
    return await createThumbnailFromDataUrl(imageDataUrl, this.userConfig.thumbnailWidth, minHeight)
  }

  /**
   * Crée un canvas avec l'image rotée
   */
  private createRotatedCanvas(image: Image, angle: number): Canvas {
    const canvas = createCanvas(this.dimensions.rawSize, this.dimensions.rawSize)
    const ctx = canvas.getContext('2d')

    rotateCanvas(ctx, image, angle, this.dimensions.rawSize / 2, this.dimensions.rawSize / 2)

    return canvas
  }

  /**
   * Calcule les paramètres de crop basés sur l'orientation optimale
   */
  private calculateCropParameters(optimal: any) {
    const xs = optimal.hull.map((p: [number, number]) => p[0])
    const ys = optimal.hull.map((p: [number, number]) => p[1])
    const minX_ = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY_ = Math.min(...ys)
    const maxY = Math.max(...ys)

    let w = maxX - minX_
    let h = maxY - minY_
    const cx = (minX_ + maxX) / 2
    const cy = (minY_ + maxY) / 2

    const targetRatio = this.dimensions.finalWidth / this.dimensions.finalHeight
    let cropW = w
    let cropH = h

    if (w / h > targetRatio) {
      cropH = w / targetRatio
    } else {
      cropW = h * targetRatio
    }

    return {
      x: cx - cropW / 2,
      y: cy - cropH / 2,
      width: cropW,
      height: cropH
    }
  }

  /**
   * Transforme le polygone vers les coordonnées du canvas final
   */
  private transformPolygonToFinalCanvas(
    polygonPixels: [number, number][],
    angle: number,
    cropParams: { x: number, y: number, width: number, height: number }
  ): [number, number][] {
    const cx = this.dimensions.rawSize / 2
    const cy = this.dimensions.rawSize / 2

    return polygonPixels.map(([x, y]) => {
      const [xr, yr] = rotatePoint([x, y], angle, cx, cy)
      const xf = ((xr - cropParams.x) * this.dimensions.finalWidth) / cropParams.width
      const yf = ((yr - cropParams.y) * this.dimensions.finalHeight) / cropParams.height
      return [xf, yf] as [number, number]
    })
  }
}
