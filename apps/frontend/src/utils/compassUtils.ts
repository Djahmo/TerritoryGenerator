import type { Coord } from "./types";
import { convexHull } from "./geometry";

/**
 * Calcule l'angle de rotation optimal pour la rose des vents basé sur le territoire
 * @param polygon Polygone du territoire (coordonnées GPS) ou objet territoire complet
 * @returns Angle en radians pour orienter la rose des vents
 */
export const calculateTerritoryOrientation = (polygon: Coord[] | { polygon: Coord[], rotation?: number }): number => {
  // Si un objet territoire complet est passé et qu'il a déjà un angle de rotation, l'utiliser directement
  if ('rotation' in polygon && polygon.rotation !== undefined) {
    const angle = polygon.rotation;
    
    // Déterminer si l'image a été retournée (comme dans flipCanvasIfNeeded)
    const isUpsideDown = Math.abs(Math.abs(angle) - Math.PI) < Math.PI / 2;
    
    // Si l'image a été retournée, il faut appliquer une rotation supplémentaire de 180° pour compenser
    if (isUpsideDown) {
      return angle + Math.PI;
    }
    
    return angle;
  }
  
  // Extraire le polygone si un objet territoire complet est passé
  const coords = 'polygon' in polygon ? polygon.polygon : polygon;
  
  // Convertir les coordonnées Coord en format [number, number][] pour convexHull
  const points: [number, number][] = coords.map(p => [p.lon, p.lat]);

  // Calculer l'enveloppe convexe du territoire
  const hull = convexHull(points);

  if (hull.length < 2) {
    return 0; // Rotation par défaut (nord en haut)
  }

  // Calculer l'orientation basée sur la plus longue arête du polygone
  let longestEdge = 0;
  let orientation = 0;

  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];

    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const edgeLength = Math.sqrt(dx * dx + dy * dy);

    if (edgeLength > longestEdge) {
      longestEdge = edgeLength;
      // Calculer l'angle de la plus longue arête, en utilisant -Math.atan2 comme dans findOptimalOrientation
      orientation = -Math.atan2(dy, dx);
    }
  }  
  // Vérifier si l'orientation est "à l'envers" comme dans flipCanvasIfNeeded
  const isUpsideDown = Math.abs(Math.abs(orientation) - Math.PI) < Math.PI / 2;
  
  // Si la carte est à l'envers, inverser l'orientation pour que le nord pointe vers le haut
  if (isUpsideDown) {
    orientation += Math.PI;
  }
    // Normaliser l'angle entre -Pi et Pi
  while (orientation > Math.PI) {
    orientation -= 2 * Math.PI;
  }
  while (orientation < -Math.PI) {
    orientation += 2 * Math.PI;
  }
  // Vérifier à nouveau si l'image aurait été retournée après normalisation
  const wouldBeFlipped = Math.abs(Math.abs(orientation) - Math.PI) < Math.PI / 2;
  
  // Si l'image aurait été retournée, il faut appliquer une rotation supplémentaire de 180° pour compenser
  if (wouldBeFlipped) {
    orientation += Math.PI;
    
    // Re-normaliser l'angle après avoir ajouté Pi
    while (orientation > Math.PI) {
      orientation -= 2 * Math.PI;
    }
    while (orientation < -Math.PI) {
      orientation += 2 * Math.PI;
    }
  }

  return orientation;
}
