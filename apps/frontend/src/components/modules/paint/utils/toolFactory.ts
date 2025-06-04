// Utilitaire pour créer des outils avec des patterns communs
import { Point, ToolType, DrawObject } from './types';
import { BrushTool, LineTool, RectangleTool, CircleTool, ArrowTool, SelectionTool, TextTool, ParkingTool, CompassTool } from '../tools';

/**
 * Interface de base pour les outils qui utilisent des coordonnées start/end
 */
export interface BaseShapeWithCoords {
  id: string;
  color: string;
  strokeWidth: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/**
 * Interface de base pour les outils qui utilisent des coordonnées x/y
 */
export interface BaseShapeWithPosition {
  id: string;
  color: string;
  x: number;
  y: number;
}

/**
 * Génère un ID unique basé sur le timestamp
 */
export const generateId = (): string => Date.now().toString();

/**
 * Crée un objet de base pour les outils utilisant des coordonnées start/end
 */
export const createBaseShapeWithCoords = <T extends BaseShapeWithCoords>(
  color: string,
  strokeWidth: number,
  startPoint: Point
): Omit<T, 'type'> => ({
  id: generateId(),
  color,
  strokeWidth,
  startX: startPoint.x,
  startY: startPoint.y,
  endX: startPoint.x,
  endY: startPoint.y,
} as Omit<T, 'type'>);

/**
 * Met à jour les coordonnées de fin pour les outils utilisant des coordonnées start/end
 */
export const updateEndCoordinates = <T extends BaseShapeWithCoords>(
  shape: T,
  endPoint: Point
): T => ({
  ...shape,
  endX: endPoint.x,
  endY: endPoint.y,
});

/**
 * Crée un objet de base pour les outils utilisant des coordonnées x/y
 */
export const createBaseShapeWithPosition = <T extends BaseShapeWithPosition>(
  color: string,
  position: Point
): Omit<T, 'type'> => ({
  id: generateId(),
  color,
  x: position.x,
  y: position.y,
} as Omit<T, 'type'>);

/**
 * Met à jour la position pour les outils utilisant des coordonnées x/y
 */
export const updatePosition = <T extends BaseShapeWithPosition>(
  shape: T,
  position: Point
): T => ({
  ...shape,
  x: position.x,
  y: position.y,
});

/**
 * Exécute une fonction de dessin avec gestion automatique du contexte Canvas
 */
export const withCanvasContext = (
  ctx: CanvasRenderingContext2D,
  drawFn: (ctx: CanvasRenderingContext2D) => void
): void => {
  ctx.save();
  drawFn(ctx);
  ctx.restore();
};

/**
 * Configure les styles de base pour les outils avec stroke
 */
export const configureStrokeStyle = (
  ctx: CanvasRenderingContext2D,
  color: string,
  strokeWidth: number,
  lineCap: CanvasLineCap = 'round'
): void => {
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = lineCap;
};

/**
 * Configure les styles de base pour les outils avec fill
 */
export const configureFillStyle = (
  ctx: CanvasRenderingContext2D,
  color: string
): void => {
  ctx.fillStyle = color;
};

/**
 * Calcule les bornes d'un ensemble de coordonnées
 */
export const getBoundsFromCoords = (coords: { x: number; y: number }[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} => {
  const xs = coords.map(p => p.x);
  const ys = coords.map(p => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };
};

/**
 * Calcule les bornes d'un rectangle défini par startX/startY et endX/endY
 */
export const getBoundsFromRect = (obj: { startX: number; startY: number; endX: number; endY: number }): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} => ({
  minX: Math.min(obj.startX, obj.endX),
  maxX: Math.max(obj.startX, obj.endX),
  minY: Math.min(obj.startY, obj.endY),
  maxY: Math.max(obj.startY, obj.endY)
});

/**
 * Calcule le centre d'un rectangle
 */
export const getRectCenter = (obj: { startX: number; startY: number; endX: number; endY: number }): Point => ({
  x: (obj.startX + obj.endX) / 2,
  y: (obj.startY + obj.endY) / 2
});

/**
 * Calcule les dimensions d'un rectangle
 */
export const getRectDimensions = (obj: { startX: number; startY: number; endX: number; endY: number }): {
  width: number;
  height: number;
} => ({
  width: Math.abs(obj.endX - obj.startX),
  height: Math.abs(obj.endY - obj.startY)
});

/**
 * Factory générique pour la création d'outils
 */
export const createToolShape = (
  toolType: ToolType,
  color: string,
  strokeWidth: number,
  fontSize: number,
  point: Point
): DrawObject | null => {
  switch (toolType) {
    case 'text':
      return TextTool.createNew(color, fontSize, point);
    case 'parking':
      return ParkingTool.createNew(color, point);
    case 'compass':
      return CompassTool.createNew(color, point);
    case 'selection':
      return SelectionTool.createNew(point);
    case 'brush':
      return BrushTool.createNew(color, strokeWidth, point);
    case 'line':
      return LineTool.createNew(color, strokeWidth, point);
    case 'rectangle':
      return RectangleTool.createNew(color, strokeWidth, point);
    case 'circle':
      return CircleTool.createNew(color, strokeWidth, point);
    case 'arrow':
      return ArrowTool.createNew(color, strokeWidth, point);
    default:
      return null;
  }
};

/**
 * Factory générique pour la mise à jour d'outils
 */
export const updateToolShape = (
  toolType: ToolType,
  currentShape: DrawObject,
  point: Point
): DrawObject | null => {
  if (!currentShape || currentShape.type !== toolType) return null;

  switch (toolType) {
    case 'brush':
      if (currentShape.type === 'brush') {
        return BrushTool.addPoint(currentShape, point);
      }
      break;
    case 'line':
      if (currentShape.type === 'line') {
        return LineTool.updateEnd(currentShape, point);
      }
      break;
    case 'rectangle':
      if (currentShape.type === 'rectangle') {
        return RectangleTool.updateEnd(currentShape, point);
      }
      break;
    case 'circle':
      if (currentShape.type === 'circle') {
        return CircleTool.updateEnd(currentShape, point);
      }
      break;
    case 'arrow':
      if (currentShape.type === 'arrow') {
        return ArrowTool.updateEnd(currentShape, point);
      }
      break;
    case 'selection':
      if (currentShape.type === 'selection') {
        return SelectionTool.updateEnd(currentShape, point);
      }
      break;
    case 'compass':
      if (currentShape.type === 'compass') {
        return CompassTool.updatePosition(currentShape, point);
      }
      break;
    default:
      return null;
  }
  return null;
};

/**
 * Factory générique pour le dessin d'outils
 */
export const drawToolShape = (
  ctx: CanvasRenderingContext2D,
  shape: DrawObject
): void => {
  switch (shape.type) {
    case 'brush':
      BrushTool.draw(ctx, shape);
      break;
    case 'line':
      LineTool.draw(ctx, shape);
      break;
    case 'rectangle':
      RectangleTool.draw(ctx, shape);
      break;
    case 'circle':
      CircleTool.draw(ctx, shape);
      break;
    case 'arrow':
      ArrowTool.draw(ctx, shape);
      break;
    case 'selection':
      SelectionTool.draw(ctx, shape);
      break;
    case 'text':
      TextTool.draw(ctx, shape);
      break;
    case 'parking':
      ParkingTool.draw(ctx, shape);
      break;
    case 'compass':
      CompassTool.draw(ctx, shape);
      break;
  }
};

/**
 * Factory générique pour la création de formes de prévisualisation
 */
export const createPreviewShape = (
  toolType: ToolType,
  startPoint: Point,
  currentPoint: Point,
  color: string,
  strokeWidth: number,
  currentShape?: DrawObject
): DrawObject | null => {
  // Cas spécial pour le pinceau - utiliser la forme existante
  if (toolType === 'brush' && currentShape) {
    return currentShape;
  }

  // Pour les autres outils, créer une nouvelle forme et la mettre à jour
  const newShape = createToolShape(toolType, color, strokeWidth, 14, startPoint);
  if (!newShape) return null;

  return updateToolShape(toolType, newShape, currentPoint);
};
