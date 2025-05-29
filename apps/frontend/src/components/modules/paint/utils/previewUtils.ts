import { Point, ToolType, DrawObject, DrawBrush } from './types';
import { createPreviewShape, drawToolShape } from './toolFactory';
import { getObjectBounds } from './selectionUtils';

export const drawPreviewShape = (ctx: CanvasRenderingContext2D, toolType: ToolType, startPoint: Point, currentPoint: Point, color: string, strokeWidth: number, currentShape: DrawBrush): void => {
  ctx.save();
  ctx.globalAlpha = 0.5;

  const previewShape = createPreviewShape(toolType, startPoint, currentPoint, color, strokeWidth, currentShape);
  if (previewShape) {
    drawToolShape(ctx, previewShape);
  }

  ctx.restore();
}

export const drawCursorPreview = (ctx: CanvasRenderingContext2D, toolType: ToolType, position: Point, strokeWidth: number, zoom: number = 1): void => {
  if (!['brush', 'line', 'arrow'].includes(toolType)) return;

  ctx.save();
  ctx.strokeStyle = '#666';
  ctx.setLineDash([]);
  ctx.lineWidth = Math.max(1, 1 / zoom);

  ctx.beginPath();
  ctx.arc(position.x, position.y, (strokeWidth + 1) / 2, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

export const renderCanvas = (ctx: CanvasRenderingContext2D, objects: DrawObject[], selectedIndices: number[] = []): void => {
  objects.forEach((obj) => {
    drawToolShape(ctx, obj);
  });

  // Ajouter les effets de sélection par-dessus
  if (selectedIndices.length > 0) {
    selectedIndices.forEach(index => {
      if (index < objects.length) {
        const obj = objects[index];
        const bounds = getObjectBounds(obj);

        if (bounds) {
          // Fond bleu transparent
          ctx.save();
          ctx.globalAlpha = 0.1;
          ctx.fillStyle = '#007ACC';
          ctx.fillRect(bounds.x - 15, bounds.y - 15, bounds.width + 30, bounds.height + 30);
          ctx.restore();

          // Contour en pointillés
          ctx.save();
          ctx.strokeStyle = '#007ACC';
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(bounds.x - 15, bounds.y - 15, bounds.width + 30, bounds.height + 30);
          ctx.restore();
        }
      }
    });
  }
};
