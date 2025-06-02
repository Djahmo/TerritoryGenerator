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
  // Détecter les images portrait avec hauteur limitée 
  // IMPORTANT: Appliquer SEULEMENT aux images en format portrait (height > width)
  const isPortraitWithHeightLimit = img.height > 700 && img.height > img.width

  // Détecter si l'image est plus petite que le canvas sur une dimension
  const imageWidthSmallerThanCanvas = imgWidth < canvasWidth
  const imageHeightSmallerThanCanvas = imgHeight < canvasHeight

  if (allowFreePosition || (imageWidthSmallerThanCanvas && imageHeightSmallerThanCanvas)) {
    // Positionnement libre complet pour les très petites images
    const maxOffsetX = canvasWidth * 0.5
    const minOffsetX = canvasWidth - imgWidth - canvasWidth * 0.5
    const maxOffsetY = canvasHeight * 0.5
    const minOffsetY = canvasHeight - imgHeight - canvasHeight * 0.5

    clampedX = Math.min(maxOffsetX, Math.max(minOffsetX, offset.x))
    clampedY = Math.min(maxOffsetY, Math.max(minOffsetY, offset.y))  } else if (isPortraitWithHeightLimit) {
    // Pour les images portrait (hauteur > 700px) :
    // - Axe X : limites spécifiques basées sur la largeur de l'image au zoom minimum
    // - Axe Y : contraintes classiques (haut/bas)

    // Calculer la largeur de l'image au zoom minimum (quand elle est redimensionnée à 700px de hauteur)
    const heightRatio = img.height / 700;
    const adjustedImgWidth = img.width / heightRatio;
    const zoomMin = Math.min(canvasWidth / adjustedImgWidth, 700 / img.height);
    const imgWidthAtMinZoom = img.width * zoomMin;

    // Axe X : vos calculs spécifiques
    // Le bord droit de l'image ne doit jamais être plus à l'intérieur que cette limite
    const rightBorderLimit = imgWidthAtMinZoom / 2 + canvasWidth / 2;
    // Le bord gauche de l'image ne doit jamais être plus à l'intérieur que cette limite
    const leftBorderLimit = canvasWidth / 2 - imgWidthAtMinZoom / 2;

    // Convertir en limites d'offset :
    // - maxOffsetX : quand le bord gauche de l'image est à leftBorderLimit
    // - minOffsetX : quand le bord droit de l'image est à rightBorderLimit
    const maxOffsetX = leftBorderLimit; // Bord gauche à la limite gauche
    const minOffsetX = rightBorderLimit - imgWidth; // Bord droit à la limite droite

    clampedX = Math.min(maxOffsetX, Math.max(minOffsetX, offset.x));

    // Axe Y : contraintes classiques pour couvrir le canvas
    clampedY = Math.min(0, Math.max(canvasHeight - imgHeight, offset.y));
  } else if (imageWidthSmallerThanCanvas) {
    // Pour les images plus étroites que le canvas (mais pas portrait) :
    // - Axe X libre avec limites raisonnables
    // - Axe Y contraint selon la taille

    const maxOffsetX = canvasWidth * 0.5
    const minOffsetX = canvasWidth - imgWidth - canvasWidth * 0.5
    clampedX = Math.min(maxOffsetX, Math.max(minOffsetX, offset.x))

    // Axe Y : contraintes selon la taille de l'image
    if (imgHeight >= canvasHeight) {
      clampedY = Math.min(0, Math.max(canvasHeight - imgHeight, offset.y))
    } else {
      const maxOffsetY = canvasHeight * 0.5
      const minOffsetY = canvasHeight - imgHeight - canvasHeight * 0.5
      clampedY = Math.min(maxOffsetY, Math.max(minOffsetY, offset.y))
    }
  } else {
    // Comportement classique : s'assurer que l'image couvre entièrement le canvas
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
