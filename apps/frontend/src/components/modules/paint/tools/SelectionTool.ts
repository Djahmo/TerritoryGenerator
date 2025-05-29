import { DrawSelection, Point, DrawObject } from '../utils/types';
import { isPointInObject, getObjectCenter } from '../utils/selectionUtils';
import { generateId, getBoundsFromRect } from '../utils/toolFactory';

export class SelectionTool {
  static draw(ctx: CanvasRenderingContext2D, selection: DrawSelection): void {
    const width = selection.endX - selection.startX;
    const height = selection.endY - selection.startY;

    ctx.save();
    ctx.strokeStyle = '#007ACC';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.rect(selection.startX, selection.startY, width, height);
    ctx.stroke();
    ctx.restore();
  }  static createNew(startPoint: Point): DrawSelection {
    return {
      id: generateId(),
      type: 'selection',
      startX: startPoint.x,
      startY: startPoint.y,
      endX: startPoint.x,
      endY: startPoint.y
    };
  }

  static updateEnd(selection: DrawSelection, endPoint: Point): DrawSelection {
    return {
      ...selection,
      endX: endPoint.x,
      endY: endPoint.y
    };
  }
  static getSelectedObjects(selection: DrawSelection, objects: DrawObject[]): DrawObject[] {
    const bounds = getBoundsFromRect(selection);

    return objects.filter(obj => {
      const center = getObjectCenter(obj);
      return center.x >= bounds.minX && center.x <= bounds.maxX &&
             center.y >= bounds.minY && center.y <= bounds.maxY;
    });
  }

  static findObjectAt(point: Point, objects: DrawObject[]): DrawObject | null {
    // Check from last to first (top to bottom in visual terms)
    for (let i = objects.length - 1; i >= 0; i--) {
      if (isPointInObject(point, objects[i])) {
        return objects[i];
      }
    }
    return null;
  }
}
