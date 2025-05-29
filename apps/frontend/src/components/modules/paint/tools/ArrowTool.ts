import { DrawArrow, Point } from '../utils/types';
import { createBaseShapeWithCoords, updateEndCoordinates, withCanvasContext, configureStrokeStyle } from '../utils/toolFactory';

export class ArrowTool {  static draw(ctx: CanvasRenderingContext2D, arrow: DrawArrow): void {
    const dx = arrow.endX - arrow.startX;
    const dy = arrow.endY - arrow.startY;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return;

    const arrowHeadLength = Math.min(20, length * 0.3);
    const arrowHeadAngle = Math.PI / 6;

    // Calculate shortened line end point
    const shortenedEndX = arrow.startX + (dx * (length - arrowHeadLength)) / length;
    const shortenedEndY = arrow.startY + (dy * (length - arrowHeadLength)) / length;

    withCanvasContext(ctx, (ctx) => {
      configureStrokeStyle(ctx, arrow.color, arrow.strokeWidth, 'round');

      // Draw main line (shortened)
      ctx.beginPath();
      ctx.moveTo(arrow.startX, arrow.startY);
      ctx.lineTo(shortenedEndX, shortenedEndY);
      ctx.stroke();

      // Draw arrowhead
      const angle = Math.atan2(dy, dx);

      ctx.beginPath();
      ctx.moveTo(arrow.endX, arrow.endY);
      ctx.lineTo(
        arrow.endX - arrowHeadLength * Math.cos(angle - arrowHeadAngle),
        arrow.endY - arrowHeadLength * Math.sin(angle - arrowHeadAngle)
      );
      ctx.moveTo(arrow.endX, arrow.endY);
      ctx.lineTo(
        arrow.endX - arrowHeadLength * Math.cos(angle + arrowHeadAngle),
        arrow.endY - arrowHeadLength * Math.sin(angle + arrowHeadAngle)
      );
      ctx.stroke();
    });
  }  static createNew(color: string, strokeWidth: number, startPoint: Point): DrawArrow {
    return {
      type: 'arrow',
      ...createBaseShapeWithCoords(color, strokeWidth, startPoint)
    };
  }

  static updateEnd(arrow: DrawArrow, endPoint: Point): DrawArrow {
    return updateEndCoordinates(arrow, endPoint);
  }
}
