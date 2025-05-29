import { Point } from './types';

export const getLogicalCoords = (
  e: React.PointerEvent,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  canvasDims: { w: number; h: number },
  offset: { x: number; y: number },
  zoom: number
): [number, number] => {
  if (!canvasRef.current) return [0, 0]

  const rect = canvasRef.current.getBoundingClientRect()
  const x = ((e.clientX - rect.left) * canvasDims.w / rect.width)
  const y = ((e.clientY - rect.top) * canvasDims.h / rect.height)
  const lx = (x - offset.x) / zoom
  const ly = (y - offset.y) / zoom
  return [lx, ly]
}

export const calculateMinZoom = (
  img: HTMLImageElement | null,
  canvasDims: { w: number; h: number }
): number => {
  if (!img) return 1

  // Le zoom minimum doit s'assurer que l'image couvre entièrement le canvas
  // Utilisation du max pour garantir que les deux dimensions sont couvertes
  return Math.max(canvasDims.w / img.width, canvasDims.h / img.height)
}

export const clampOffset = (
  offset: { x: number; y: number },
  zoom: number,
  img: HTMLImageElement | null,
  canvasDims: { w: number; h: number },
  allowFreePosition: boolean = false
) => {
  if (!img) return offset

  const { w: canvasWidth, h: canvasHeight } = canvasDims
  const imgWidth = img.width * zoom
  const imgHeight = img.height * zoom

  let clampedX = offset.x
  let clampedY = offset.y

  if (allowFreePosition) {
    // Allow free positioning, but limit how far the image can go
    const maxOffsetX = canvasWidth * 0.5
    const minOffsetX = canvasWidth - imgWidth - canvasWidth * 0.5
    const maxOffsetY = canvasHeight * 0.5
    const minOffsetY = canvasHeight - imgHeight - canvasHeight * 0.5

    clampedX = Math.min(maxOffsetX, Math.max(minOffsetX, offset.x))
    clampedY = Math.min(maxOffsetY, Math.max(minOffsetY, offset.y))
  } else {
    // S'assurer que l'image couvre entièrement le canvas
    // L'image ne peut pas avoir ses bords à l'intérieur du canvas
    clampedX = Math.min(0, Math.max(canvasWidth - imgWidth, offset.x))
    clampedY = Math.min(0, Math.max(canvasHeight - imgHeight, offset.y))
  }

  return {
    x: clampedX,
    y: clampedY
  }
}

/**
 * Transformations de coordonnées optimisées pour le canvas
 */

/**
 * Interface pour les paramètres de transformation du canvas
 */
export interface CanvasTransformParams {
  canvasDims: { w: number; h: number };
  offset: { x: number; y: number };
  zoom: number;
}

/**
 * Obtient le rectangle de délimitation du canvas en tenant compte de l'échelle d'affichage
 */
export const getCanvasRect = (canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect();
  return {
    rect,
    scaleX: canvas.width / rect.width,
    scaleY: canvas.height / rect.height,
  };
};

/**
 * Convertit les coordonnées de la souris en coordonnées du canvas
 */
export const mouseToCanvas = (
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement
): Point => {
  const { rect, scaleX, scaleY } = getCanvasRect(canvas);
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
};

/**
 * Convertit les coordonnées du canvas en coordonnées du monde (avec zoom et offset)
 */
export const canvasToWorld = (
  canvasPoint: Point,
  transformParams: CanvasTransformParams
): Point => {
  const { offset, zoom } = transformParams;
  return {
    x: (canvasPoint.x - offset.x) / zoom,
    y: (canvasPoint.y - offset.y) / zoom,
  };
};

/**
 * Convertit les coordonnées du monde en coordonnées du canvas
 */
export const worldToCanvas = (
  worldPoint: Point,
  transformParams: CanvasTransformParams
): Point => {
  const { offset, zoom } = transformParams;
  return {
    x: worldPoint.x * zoom + offset.x,
    y: worldPoint.y * zoom + offset.y,
  };
};

/**
 * Convertit les coordonnées du monde en coordonnées d'écran (avec l'échelle d'affichage)
 */
export const worldToScreen = (
  worldPoint: Point,
  canvas: HTMLCanvasElement,
  transformParams: CanvasTransformParams
): Point => {
  const canvasPoint = worldToCanvas(worldPoint, transformParams);
  const { scaleX, scaleY } = getCanvasRect(canvas);
  return {
    x: canvasPoint.x / scaleX,
    y: canvasPoint.y / scaleY,
  };
};

/**
 * Convertit directement les coordonnées de la souris en coordonnées du monde
 */
export const mouseToWorld = (
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  transformParams: CanvasTransformParams
): Point => {
  const canvasPoint = mouseToCanvas(clientX, clientY, canvas);
  return canvasToWorld(canvasPoint, transformParams);
};

/**
 * Optimisation de getLogicalCoords pour utiliser les nouvelles transformations
 */
export const getLogicalCoordsOptimized = (
  e: React.PointerEvent,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  transformParams: CanvasTransformParams
): [number, number] => {
  if (!canvasRef.current) return [0, 0];

  const worldPoint = mouseToWorld(e.clientX, e.clientY, canvasRef.current, transformParams);
  return [worldPoint.x, worldPoint.y];
};
