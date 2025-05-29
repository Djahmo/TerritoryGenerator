import { DrawRectangle, Point } from '../utils/types';
import { createBaseShapeWithCoords, updateEndCoordinates, withCanvasContext, configureStrokeStyle } from '../utils/toolFactory';

export class RectangleTool {  static draw(ctx: CanvasRenderingContext2D, rectangle: DrawRectangle): void {
    const width = rectangle.endX - rectangle.startX;
    const height = rectangle.endY - rectangle.startY;

    withCanvasContext(ctx, (ctx) => {
      configureStrokeStyle(ctx, rectangle.color, rectangle.strokeWidth);

      ctx.beginPath();
      ctx.rect(rectangle.startX, rectangle.startY, width, height);
      ctx.stroke();
    });
  }  static createNew(color: string, strokeWidth: number, startPoint: Point): DrawRectangle {
    return {
      type: 'rectangle',
      ...createBaseShapeWithCoords(color, strokeWidth, startPoint)
    };
  }

  static updateEnd(rectangle: DrawRectangle, endPoint: Point): DrawRectangle {
    return updateEndCoordinates(rectangle, endPoint);
  }
}
