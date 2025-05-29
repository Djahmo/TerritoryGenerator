import { DrawParking, Point } from '../utils/types';
import { createBaseShapeWithPosition, updatePosition as updatePositionBase, withCanvasContext, configureStrokeStyle, configureFillStyle } from '../utils/toolFactory';

export class ParkingTool {  static draw(ctx: CanvasRenderingContext2D, parking: DrawParking): void {
    const size = 60; // Taille doublée (30 -> 60)
    const x = parking.x - size / 2;
    const y = parking.y - size / 2;

    withCanvasContext(ctx, (ctx) => {
      // Draw parking symbol background (rounded rectangle) - fond bleu
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, 6); // Rayon légèrement augmenté pour la nouvelle taille
      configureFillStyle(ctx, '#2563eb'); // Fond bleu
      ctx.fill();

      // Contour blanc
      configureStrokeStyle(ctx, '#ffffff', 3); // Contour blanc plus épais
      ctx.stroke();

      // Draw "P" letter en blanc
      ctx.font = 'bold 40px Arial'; // Police plus grande pour la nouvelle taille
      configureFillStyle(ctx, '#ffffff'); // Texte blanc
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('P', parking.x, parking.y);
    });
  }  static createNew(color: string, position: Point): DrawParking {
    return {
      type: 'parking',
      ...createBaseShapeWithPosition(color, position)
    };
  }

  static updatePosition(parking: DrawParking, position: Point): DrawParking {
    return updatePositionBase(parking, position);
  }
}
