import type { PaintLayer } from '../utils/types'
import type { DrawObject } from '../components/modules/paint/utils/types'

/**
 * Service de conversion entre DrawObjects et PaintLayers
 */
export class LayerService {
  /**
   * Génère un ID unique pour un layer
   */
  private static generateLayerId(type: string): string {
    return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }


  static convertDrawObjectToLayer(drawObject: DrawObject): PaintLayer | null {
    if (!drawObject) return null
    console.log('[LayerService] Converting DrawObject to Layer:', drawObject);
    const baseLayer = {
      id: LayerService.generateLayerId(drawObject.type),
      type: drawObject.type as PaintLayer['type'],
      visible: true,
      locked: false,
      timestamp: Date.now(),
      style: {
        color: (drawObject as any).color || '#000000',
        strokeWidth: (drawObject as any).strokeWidth || 2
      }
    }

    switch (drawObject.type) {
      case 'brush':
        return {
          ...baseLayer,
          type: 'brush',
          data: {
            points: drawObject.points || []
          }
        } as PaintLayer

      case 'line':
        return {
          ...baseLayer,
          type: 'line',
          data: {
            startPoint: { x: drawObject.startX, y: drawObject.startY },
            endPoint: { x: drawObject.endX, y: drawObject.endY }
          }
        } as PaintLayer

      case 'arrow':
        return {
          ...baseLayer,
          type: 'arrow',
          data: {
            startPoint: { x: drawObject.startX, y: drawObject.startY },
            endPoint: { x: drawObject.endX, y: drawObject.endY }
          }
        } as PaintLayer

      case 'circle':
        const centerX = (drawObject.startX + drawObject.endX) / 2
        const centerY = (drawObject.startY + drawObject.endY) / 2
        const radiusX = Math.abs(drawObject.endX - drawObject.startX) / 2
        const radiusY = Math.abs(drawObject.endY - drawObject.startY) / 2
        return {
          ...baseLayer,
          type: 'circle',
          data: {
            center: { x: centerX, y: centerY },
            radiusX,
            radiusY
          }
        } as PaintLayer

      case 'rectangle':
        return {
          ...baseLayer,
          type: 'rectangle',
          data: {
            startPoint: { x: drawObject.startX, y: drawObject.startY },
            endPoint: { x: drawObject.endX, y: drawObject.endY }
          }
        } as PaintLayer

      case 'text':
        return {
          ...baseLayer,
          type: 'text',
          data: {
            position: { x: drawObject.x, y: drawObject.y },
            content: drawObject.content || '',
            fontSize: (drawObject as any).fontSize || 16
          }
        } as PaintLayer

      case 'parking':
        return {
          ...baseLayer,
          type: 'parking',
          data: {
            position: { x: drawObject.x, y: drawObject.y }
          }
        } as PaintLayer

      default:
        return null
    }
  }

  /**
   * Convertit un PaintLayer en DrawObject
   */
  static convertLayerToDrawObject(layer: PaintLayer): DrawObject | null {
    if (!layer) return null
    console.log('[LayerService] Converting Layer to DrawObject:', layer);

    const baseObject = {
      type: layer.type,
      color: layer.style.color,
      strokeWidth: layer.style.strokeWidth || 2
    }

    switch (layer.type) {
      case 'brush':
        return {
          ...baseObject,
          type: 'brush',
          points: layer.data.points
        } as DrawObject

      case 'line':
        return {
          ...baseObject,
          type: 'line',
          startX: layer.data.startPoint.x,
          startY: layer.data.startPoint.y,
          endX: layer.data.endPoint.x,
          endY: layer.data.endPoint.y
        } as DrawObject

      case 'arrow':
        return {
          ...baseObject,
          type: 'arrow',
          startX: layer.data.startPoint.x,
          startY: layer.data.startPoint.y,
          endX: layer.data.endPoint.x,
          endY: layer.data.endPoint.y
        } as DrawObject

      case 'circle':
        const radiusX = layer.data.radiusX
        const radiusY = layer.data.radiusY
        return {
          ...baseObject,
          type: 'circle',
          startX: layer.data.center.x - radiusX,
          startY: layer.data.center.y - radiusY,
          endX: layer.data.center.x + radiusX,
          endY: layer.data.center.y + radiusY
        } as DrawObject
      case 'rectangle':
        return {
          ...baseObject,
          type: 'rectangle',
          startX: layer.data.startPoint.x,
          startY: layer.data.startPoint.y,
          endX: layer.data.endPoint.x,
          endY: layer.data.endPoint.y
        } as DrawObject

      case 'text':
        return {
          ...baseObject,
          type: 'text',
          id: `text_${Date.now()}`,
          x: layer.data.position.x,
          y: layer.data.position.y,
          content: layer.data.content,
          fontSize: (layer.data as any).fontSize || 16
        } as DrawObject

      case 'parking':
        return {
          ...baseObject,
          type: 'parking',
          id: `parking_${Date.now()}`,
          x: layer.data.position.x,
          y: layer.data.position.y
        } as DrawObject

      default:
        return null
    }
  }
}
