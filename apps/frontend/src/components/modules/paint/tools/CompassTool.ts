import { DrawCompass, Point } from '../utils/types';
import { createBaseShapeWithPosition, updatePosition as updatePositionBase, withCanvasContext, configureStrokeStyle, configureFillStyle } from '../utils/toolFactory';

export class CompassTool {  static draw(ctx: CanvasRenderingContext2D, compass: DrawCompass): void {
    const size = 320; // Taille de la rose des vents (agrandie x4, initialement 80)
    const x = compass.x;
    const y = compass.y;
    const rotation = compass.rotation || 0;

    withCanvasContext(ctx, (ctx) => {
      // Translation au centre de la boussole
      ctx.translate(x, y);

      // Appliquer la rotation
      // La rotation est déjà correctement ajustée pour tenir compte du retournement d'image
      ctx.rotate(rotation);

      // Cercle extérieur
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
      configureFillStyle(ctx, 'rgba(255, 255, 255, 0.9)');
      ctx.fill();
      configureStrokeStyle(ctx, '#333333', 8);
      ctx.stroke();// Cercle intérieur
      ctx.beginPath();
      ctx.arc(0, 0, size / 2 - 32, 0, 2 * Math.PI);
      configureStrokeStyle(ctx, '#666666', 4);
      ctx.stroke();// Points cardinaux principaux (N, S, E, W)
      const directions = [
        { angle: -Math.PI / 2, label: 'N', color: '#FF0000', size: 48 }, // Nord en rouge
        { angle: 0, label: 'E', color: '#333333', size: 40 },             // Est
        { angle: Math.PI / 2, label: 'S', color: '#333333', size: 40 },   // Sud
        { angle: Math.PI, label: 'W', color: '#333333', size: 40 }        // Ouest
      ];      directions.forEach(({ angle, label, color, size: fontSize }) => {
        const radius = size / 2 - 80;
        const labelX = Math.cos(angle) * radius;
        const labelY = Math.sin(angle) * radius;

        ctx.font = `bold ${fontSize}px Arial`;
        configureFillStyle(ctx, color);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, labelX, labelY);
      });      // Flèche Nord (triangle rouge pointant vers le nord)
      ctx.beginPath();
      ctx.moveTo(0, -size / 2 + 16); // Pointe vers le haut
      ctx.lineTo(-24, -size / 2 + 64);
      ctx.lineTo(24, -size / 2 + 64);
      ctx.closePath();
      configureFillStyle(ctx, '#FF0000');
      ctx.fill();
      configureStrokeStyle(ctx, '#AA0000', 4);
      ctx.stroke();

      // Croix centrale
      configureStrokeStyle(ctx, '#333333', 4);
      ctx.beginPath();
      ctx.moveTo(-32, 0);
      ctx.lineTo(32, 0);
      ctx.moveTo(0, -32);
      ctx.lineTo(0, 32);
      ctx.stroke();

      // Point central
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, 2 * Math.PI);
      configureFillStyle(ctx, '#333333');
      ctx.fill();
    });
  }  static createNew(color: string, position: Point, rotation?: number): DrawCompass {
    // Normaliser l'angle entre -Pi et Pi si fourni
    let normalizedRotation
    if (rotation !== undefined && rotation !== null) {
      normalizedRotation = -rotation;
    }
    else {
      normalizedRotation = 0;
    }

    return {
      type: 'compass',
      rotation: normalizedRotation,
      ...createBaseShapeWithPosition(color, position)
    };
  }

  static updatePosition(compass: DrawCompass, position: Point): DrawCompass {
    return updatePositionBase(compass, position);
  }  static updateRotation(compass: DrawCompass, rotation: number): DrawCompass {
    // Normaliser l'angle entre -Pi et Pi
    let normalizedRotation = rotation;

    if (rotation !== undefined && rotation !== null) {
      normalizedRotation = -rotation;
    }
    else {
      normalizedRotation = 0;
    }
    return {
      ...compass,
      rotation: normalizedRotation
    };
  }
}
