import { DrawCircle, Point } from '../utils/types';
import { createBaseShapeWithCoords, updateEndCoordinates, withCanvasContext, configureStrokeStyle } from '../utils/toolFactory';

export class CircleTool {  static draw(ctx: CanvasRenderingContext2D, circle: DrawCircle): void {
    const centerX = (circle.startX + circle.endX) / 2;
    const centerY = (circle.startY + circle.endY) / 2;
    const radiusX = Math.abs(circle.endX - circle.startX) / 2;
    const radiusY = Math.abs(circle.endY - circle.startY) / 2;

    withCanvasContext(ctx, (ctx) => {
      configureStrokeStyle(ctx, circle.color, circle.strokeWidth);

      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.stroke();
    });
  }  static createNew(color: string, strokeWidth: number, startPoint: Point): DrawCircle {
    return {
      type: 'circle',
      ...createBaseShapeWithCoords(color, strokeWidth, startPoint)
    };
  }

  static updateEnd(circle: DrawCircle, endPoint: Point): DrawCircle {
    return updateEndCoordinates(circle, endPoint);
  }
}
