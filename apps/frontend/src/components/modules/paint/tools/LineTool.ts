import { DrawLine, Point } from '../utils/types';
import { createBaseShapeWithCoords, updateEndCoordinates, withCanvasContext, configureStrokeStyle } from '../utils/toolFactory';

export class LineTool {  static draw(ctx: CanvasRenderingContext2D, line: DrawLine): void {
    withCanvasContext(ctx, (ctx) => {
      configureStrokeStyle(ctx, line.color, line.strokeWidth);

      ctx.beginPath();
      ctx.moveTo(line.startX, line.startY);
      ctx.lineTo(line.endX, line.endY);
      ctx.stroke();
    });
  }  static createNew(color: string, strokeWidth: number, startPoint: Point): DrawLine {
    return {
      type: 'line',
      ...createBaseShapeWithCoords(color, strokeWidth, startPoint)
    };
  }

  static updateEnd(line: DrawLine, endPoint: Point): DrawLine {
    return updateEndCoordinates(line, endPoint);
  }
}
