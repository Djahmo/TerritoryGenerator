import type { Territory } from "%/types"
import {
  calculateBoundingBox,
  convexHull,
  gpsToPixel,
  findOptimalOrientation,
  rotatePoint
} from '../utils/geometry'
import {
  drawMask,
  drawContour,
  rotateCanvas,
  cropAndResize,
  flipCanvasIfNeeded
} from '../utils/canvas'
import { loadImageBitmap, buildIgnUrl } from './networkService'
import { createThumbnail } from './thumbnailService'
import { type GeneratedImage, type ImageGenerationConfig } from '../utils/types'

/**
 * Service principal pour la génération d'images de territoires
 */
export class TerritoryImageService {
  constructor(
    private config: { ppp: number },
    private dimensions: {
      finalWidth: number
      finalHeight: number
      rawSize: number
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
   */  async generateStandardImage(
    territory: Territory,
    options: ImageGenerationConfig = {}
  ): Promise<GeneratedImage> {
    const { contourColor, contourWidth } = {
      contourColor: this.userConfig.contourColor,
      contourWidth: this.userConfig.contourWidth,
      ...options
    }

    // 1. Calcul de la bounding box
    const bbox = calculateBoundingBox(territory.polygon, false, this.config, this.PHI)    // 2. Chargement de l'image de la carte
    const url = buildIgnUrl(bbox, this.dimensions.rawSize, {
      baseUrl: this.userConfig.ignApiBaseUrl,
      layer: this.userConfig.ignApiLayer,
      format: this.userConfig.ignApiFormat,
      crs: this.userConfig.ignApiCRS
    })
    const mapImage = await loadImageBitmap(
      url,
      this.userConfig.networkRetries,
      this.userConfig.networkDelay
    )

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
    const ctx = croppedCanvas.getContext('2d')!
    drawMask(ctx, finalPolygon, this.dimensions.finalWidth, this.dimensions.finalHeight, {
      planLarge: false
    })
    drawContour(ctx, finalPolygon, { color: contourColor, lineWidth: contourWidth })    // 10. Correction de l'orientation si nécessaire
    const finalCanvas = flipCanvasIfNeeded(croppedCanvas, optimal.angle)    // 11. Génération de l'image et de la miniature
    const image = finalCanvas.toDataURL('image/png')
    const minHeight = Math.round(this.dimensions.finalHeight / this.dimensions.finalWidth * this.userConfig.thumbnailWidth)
    const miniature = await createThumbnail(image, this.userConfig.thumbnailWidth, minHeight)

    return { image, miniature }
  }

  /**
   * Génère une image large (sans optimisation d'orientation)
   */  async generateLargeImage(
    territory: Territory,
    options: ImageGenerationConfig = {}
  ): Promise<string> {
    const { contourColor, contourWidth } = {
      contourColor: this.userConfig.contourColor,
      contourWidth: this.userConfig.contourWidth,
      ...options
    }

    // 1. Calcul de la bounding box pour plan large
    const bbox = calculateBoundingBox(territory.polygon, true, this.config, this.PHI)    // 2. Chargement de l'image
    const url = buildIgnUrl(bbox, this.dimensions.rawSize, {
      baseUrl: this.userConfig.ignApiBaseUrl,
      layer: this.userConfig.ignApiLayer,
      format: this.userConfig.ignApiFormat,
      crs: this.userConfig.ignApiCRS
    })
    const mapImage = await loadImageBitmap(
      url,
      this.userConfig.networkRetries,
      this.userConfig.networkDelay
    )

    // 3. Création du canvas de base
    const canvas = document.createElement('canvas')
    canvas.width = this.dimensions.rawSize
    canvas.height = this.dimensions.rawSize
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(mapImage, 0, 0)

    // 4. Redimensionnement direct
    const finalCanvas = cropAndResize(
      canvas,
      { x: 0, y: 0, width: this.dimensions.rawSize, height: this.dimensions.rawSize },
      this.dimensions.finalWidth,
      this.dimensions.finalHeight
    )

    // 5. Transformation du polygone
    const polygonPixels = territory.polygon.map(coord =>
      gpsToPixel(coord.lat, coord.lon, bbox, this.dimensions.rawSize)
    )

    const finalPolygon = polygonPixels.map(([x, y]) => {
      const xf = (x * this.dimensions.finalWidth) / this.dimensions.rawSize
      const yf = (y * this.dimensions.finalHeight) / this.dimensions.rawSize
      return [xf, yf] as [number, number]
    })

    // 6. Ajout du masque et du contour
    const finalCtx = finalCanvas.getContext('2d')!
    drawMask(finalCtx, finalPolygon, this.dimensions.finalWidth, this.dimensions.finalHeight, {
      planLarge: true
    })
    drawContour(finalCtx, finalPolygon, { color: contourColor, lineWidth: contourWidth })

    return finalCanvas.toDataURL('image/png')
  }

  /**
   * Génère une miniature à partir d'une image existante
   */  async generateThumbnailFromImage(imageDataUrl: string): Promise<string> {
    const minHeight = Math.round(this.dimensions.finalHeight / this.dimensions.finalWidth * this.userConfig.thumbnailWidth)
    return await createThumbnail(imageDataUrl, this.userConfig.thumbnailWidth, minHeight)
  }

  /**
   * Crée un canvas avec l'image rotée
   */
  private createRotatedCanvas(image: ImageBitmap, angle: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = this.dimensions.rawSize
    canvas.height = this.dimensions.rawSize
    const ctx = canvas.getContext('2d')!

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
