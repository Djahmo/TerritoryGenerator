import type { DrawObject, Point } from "./types"
import { getBoundsFromCoords, getBoundsFromRect, getRectCenter, getRectDimensions } from './toolFactory';

export const isPointInObject = (point: Point, obj: DrawObject): boolean => {
  const { x, y } = point

  switch (obj.type) {
    case 'brush':
      const radius = obj.strokeWidth / 2
      return obj.points.some(p => {
        const distance = Math.hypot(x - p.x, y - p.y)
        return distance <= radius
      })

    case 'line':
    case 'arrow':
      const x1 = obj.startX
      const y1 = obj.startY
      const x2 = obj.endX
      const y2 = obj.endY
      const lineRadius = obj.strokeWidth / 2
      const A = x - x1
      const B = y - y1
      const C = x2 - x1
      const D = y2 - y1
      const dot = A * C + B * D
      const lenSq = C * C + D * D
      if (lenSq === 0) return Math.hypot(A, B) <= lineRadius

      const param = Math.max(0, Math.min(1, dot / lenSq))
      const projX = x1 + param * C
      const projY = y1 + param * D

      const distance = Math.hypot(x - projX, y - projY)
      return distance <= lineRadius
      case 'rectangle':
      const bounds = getBoundsFromRect(obj);
      const rectW = getRectDimensions(obj).width;
      const rectH = getRectDimensions(obj).height;

      return x >= bounds.minX && x <= bounds.minX + rectW && y >= bounds.minY && y <= bounds.minY + rectH;    case 'circle':
      const center = getRectCenter(obj);
      const radiusX = getRectDimensions(obj).width / 2;
      const radiusY = getRectDimensions(obj).height / 2;
      const dx = x - center.x;
      const dy = y - center.y;
      const normalizedDistance = (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY);
      return normalizedDistance <= 1;    case 'parking':
      const parkingRadius = 15
      const parkingDistance = Math.hypot(x - obj.x, y - obj.y)
      return parkingDistance <= parkingRadius

    case 'compass':
      const compassRadius = 160 // La taille de la rose des vents est de 320, donc rayon = 160
      const compassDistance = Math.hypot(x - obj.x, y - obj.y)
      return compassDistance <= compassRadius

    case 'text':
      const textWidth = obj.content.length * obj.fontSize * 0.6
      const textHeight = obj.fontSize
      return x >= obj.x && x <= obj.x + textWidth &&
             y >= obj.y && y <= obj.y + textHeight

    default:
      return false
  }
}

export const getObjectCenter = (obj: DrawObject): Point => {
  switch (obj.type) {
    case 'brush':
      const bounds = getBoundsFromCoords(obj.points);
      return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };

    case 'line':
    case 'arrow':
    case 'rectangle':
    case 'circle':
      return getRectCenter(obj);    case 'parking':
      return { x: obj.x, y: obj.y };

    case 'compass':
      return { x: obj.x, y: obj.y };

    case 'text':
      return { x: obj.x, y: obj.y };

    default:
      return { x: 0, y: 0 };
  }
}

export const isPointInSelectionBounds = (point: Point, obj: DrawObject): boolean => {
  const bounds = getObjectBounds(obj);
  if (!bounds) return false;

  const { x, y } = point;
  const selectionX = bounds.x - 15;
  const selectionY = bounds.y - 15;
  const selectionWidth = bounds.width + 30;
  const selectionHeight = bounds.height + 30;

  return x >= selectionX && x <= selectionX + selectionWidth &&
         y >= selectionY && y <= selectionY + selectionHeight;
};

export const getObjectBounds = (obj: DrawObject): { x: number; y: number; width: number; height: number } | null => {
  switch (obj.type) {
    case 'brush': {
      if (obj.points.length === 0) return null;
      const bounds = getBoundsFromCoords(obj.points);
      return { x: bounds.minX, y: bounds.minY, width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
    }
    case 'line':
    case 'rectangle':
    case 'circle':
    case 'arrow': {
      const bounds = getBoundsFromRect(obj);
      const dimensions = getRectDimensions(obj);
      return {
        x: bounds.minX,
        y: bounds.minY,
        width: dimensions.width,
        height: dimensions.height
      };
    }
    case 'text':
      const lineHeight = obj.fontSize * 1.2;
      const lines = obj.content.split('\n');
      const maxLineLength = Math.max(...lines.map(line => line.length));
      return {
        x: obj.x,
        y: obj.y,
        width: maxLineLength * obj.fontSize * 0.6,
        height: lines.length * lineHeight
      };    case 'parking':
      return { x: obj.x - 15, y: obj.y - 15, width: 30, height: 30 };
    case 'compass':
      return { x: obj.x - 160, y: obj.y - 160, width: 320, height: 320 };
    default:
      return null;
  }
}
