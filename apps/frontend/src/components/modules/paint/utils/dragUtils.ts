import { DrawObject} from './types';

export const moveObject = (obj: DrawObject, deltaX: number, deltaY: number): DrawObject => {
  switch (obj.type) {
    case 'brush':
      return {
        ...obj,
        points: obj.points.map(point => ({ x: point.x + deltaX, y: point.y + deltaY }))
      };

    case 'line':
    case 'rectangle':
    case 'circle':
    case 'arrow':
      return {
        ...obj,
        startX: obj.startX + deltaX,
        startY: obj.startY + deltaY,
        endX: obj.endX + deltaX,
        endY: obj.endY + deltaY
      };    case 'text':
    case 'parking':
    case 'compass':
      return {
        ...obj,
        x: obj.x + deltaX,
        y: obj.y + deltaY
      };

    default:
      return obj;
  }
};

export const moveObjects = (objects: DrawObject[], deltaX: number, deltaY: number): DrawObject[] => {
  return objects.map(obj => moveObject(obj, deltaX, deltaY));
};
