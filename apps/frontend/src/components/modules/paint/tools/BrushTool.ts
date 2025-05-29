import { DrawBrush, Point } from '../utils/types';
import { generateId, withCanvasContext, configureStrokeStyle } from '../utils/toolFactory';

export class BrushTool {  static draw(ctx: CanvasRenderingContext2D, brush: DrawBrush): void {
    if (brush.points.length < 2) return;

    withCanvasContext(ctx, (ctx) => {
      configureStrokeStyle(ctx, brush.color, brush.strokeWidth, 'round');
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(brush.points[0].x, brush.points[0].y);

      for (let i = 1; i < brush.points.length; i++) {
        ctx.lineTo(brush.points[i].x, brush.points[i].y);
      }

      ctx.stroke();
    });
  }

  static addPoint(brush: DrawBrush, point: Point): DrawBrush {
    return {
      ...brush,
      points: [...brush.points, point]
    };
  }
  static createNew(color: string, strokeWidth: number, startPoint: Point): DrawBrush {
    return {
      id: generateId(),
      type: 'brush',
      color,
      strokeWidth,
      points: [startPoint]
    };
  }
}
