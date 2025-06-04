import React, { useRef, useEffect, useCallback, useState } from 'react';
import { TOOLS } from './utils/constants';
import { Point, DrawObject, DrawBrush } from './utils/types';
import type { PaintLayer, Territory } from '../../../utils/types';
import { LayerService } from '../../../services/layerService';
import { useHistory, useCanvasState, useDrawingState } from './hooks';
import { ToolBar, ColorPickers, ActionButtons, NumericInput } from './components';
import { drawPreviewShape, drawCursorPreview, renderCanvas } from './utils/previewUtils';
import { moveObjects } from './utils/dragUtils';
import { isPointInSelectionBounds } from './utils/selectionUtils';
import { calculateMinZoom, mouseToWorld, worldToScreen as canvasWorldToScreen, CanvasTransformParams } from './utils/canvasUtils';
import { createToolShape, updateToolShape, drawToolShape } from './utils/toolFactory';
import {
  SelectionTool,
  TextTool,
  TextInputComponent
} from './tools';
import SeparatorX from '../../ui/SeparatorX';
import Cropper from './components/Cropper';

interface PaintProps {
  src?: string;
  layers?: PaintLayer[];
  onSave?: (layers: PaintLayer[], compositeImage?: string) => void;
  onCrop?: (cropData: {
    x: number;
    y: number;
    width: number;
    height: number;
    imageWidth: number;
    imageHeight: number;
  }) => void;
  isLarge?: boolean;
  territoryPolygon?: { lat: number; lon: number }[];
  territory: Territory // Ajout de la propriété polygone du territoire  territory?: any; // Objet territoire complet (optionnel)
}

const Paint: React.FC<PaintProps> = ({ src, layers, onSave, onCrop, isLarge = false, territoryPolygon, territory }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);

  const [onCropping, setOnCropping] = useState(false);

  const {
    objects,
    selectedObjects,
    setObjects,
    setSelectedObjects,
    img,
    canvasDims,
    setImg,
    setCanvasDims,
    isPanning,
    offset,
    zoom,
    setOffset,
    setZoom,
    setZoomMin,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd
  } = useCanvasState();

  const {
    addToHistory,
    undo,
    redo,
    canUndo,
    canRedo
  } = useHistory(objects);

  const {
    selectedTool,
    setSelectedTool,
    selectedColor,
    setSelectedColor,
    secondaryColor,
    setSecondaryColor,
    strokeWidth,
    setStrokeWidth,
    fontSize,
    setFontSize,
    isDrawing,
    setIsDrawing,
    startPoint,
    setStartPoint,
    currentShape,
    setCurrentShape,
    cursorPosition,
    setCursorPosition,
    textInput,
    setTextInput,
    showTextInput,
    setShowTextInput,
    isDragging,
    setIsDragging,
    draggedObjects,
    setDraggedObjects,
    dragOffset,
    setDragOffset
  } = useDrawingState();

  const [textInputScreenPos, setTextInputScreenPos] = useState<Point | null>(null);
  const [currentMode, setCurrentMode] = useState<{ isLarge: boolean; layersLoaded: boolean }>({
    isLarge: false,
    layersLoaded: false
  });

  useEffect(() => {
    if (currentMode.isLarge !== isLarge) {
      setCurrentMode({ isLarge, layersLoaded: false });
      setObjects([]);
    }

    const shouldLoadLayers = layers && layers.length > 0 &&
      (!currentMode.layersLoaded || currentMode.isLarge !== isLarge);

    if (shouldLoadLayers) {
      const drawObjects = layers
        .map(LayerService.convertLayerToDrawObject)
        .filter((obj): obj is DrawObject => obj !== null);

      setObjects(drawObjects);
      addToHistory(drawObjects);
      setCurrentMode({ isLarge, layersLoaded: true });
    } else if (!layers || layers.length === 0) {
      setCurrentMode({ isLarge, layersLoaded: false });
      if (objects.length === 0) {
        setObjects([]);
      }
    }
  }, [layers, setObjects, addToHistory, isLarge]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    if (!src) {
      backgroundImageRef.current = null;
      setImg(null);

      const containerRect = container.getBoundingClientRect();
      const canvasWidth = containerRect.width;
      const calculatedHeight = Math.round(canvasWidth * 0.75);
      const canvasHeight = Math.min(calculatedHeight, 700);

      setCanvasDims({ w: canvasWidth, h: canvasHeight });
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;

      setZoom(1);
      setZoomMin(1);
      setOffset({ x: 0, y: 0 });
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      backgroundImageRef.current = img;
      setImg(img);

      const containerRect = container.getBoundingClientRect();
      const canvasWidth = containerRect.width;

      let canvasHeight, zoomMin;

      if (img.height > 700 && img.height > img.width) {
        canvasHeight = 700;
        const heightRatio = img.height / 700;
        const adjustedImgWidth = img.width / heightRatio;
        zoomMin = Math.min(canvasWidth / adjustedImgWidth, 700 / img.height);
      } else {
        const calculatedHeight = Math.round((canvasWidth * img.height) / img.width);
        canvasHeight = Math.min(calculatedHeight, 700);
        zoomMin = calculateMinZoom(img, { w: canvasWidth, h: canvasHeight });
      }

      setCanvasDims({ w: canvasWidth, h: canvasHeight });
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;

      setZoomMin(zoomMin);
      setZoom(zoomMin);

      const scaledImgWidth = img.width * zoomMin;
      const scaledImgHeight = img.height * zoomMin;

      setOffset({
        x: (canvasWidth - scaledImgWidth) / 2,
        y: (canvasHeight - scaledImgHeight) / 2
      });
    };

    img.onerror = () => {
      backgroundImageRef.current = null;
      setImg(null);

      const containerRect = container.getBoundingClientRect();
      const canvasWidth = containerRect.width;
      const calculatedHeight = Math.round(canvasWidth * 0.75);
      const canvasHeight = Math.min(calculatedHeight, 700);

      setCanvasDims({ w: canvasWidth, h: canvasHeight });
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;

      setZoom(1);
      setZoomMin(1);
      setOffset({ x: 0, y: 0 });
    };

    img.src = src;
  }, [src, setCanvasDims, setImg, setZoom, setZoomMin, setOffset]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const containerRect = container.getBoundingClientRect();
      const canvasWidth = containerRect.width;
      let canvasHeight;

      if (backgroundImageRef.current) {
        const img = backgroundImageRef.current;

        if (img.height > 700 && img.height > img.width) {
          canvasHeight = 700;
        } else {
          const calculatedHeight = Math.round((canvasWidth * img.height) / img.width);
          canvasHeight = Math.min(calculatedHeight, 700);
        }
      } else {
        const calculatedHeight = Math.round(canvasWidth * 0.75);
        canvasHeight = Math.min(calculatedHeight, 700);
      }

      setCanvasDims({ w: canvasWidth, h: canvasHeight });
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;

      if (backgroundImageRef.current) {
        const img = backgroundImageRef.current;
        let zoomMin;

        if (img.height > 700 && img.height > img.width) {
          const heightRatio = img.height / 700;
          const adjustedImgWidth = img.width / heightRatio;
          zoomMin = Math.min(canvasWidth / adjustedImgWidth, 700 / img.height);
        } else {
          zoomMin = calculateMinZoom(img, { w: canvasWidth, h: canvasHeight });
        }

        setZoomMin(zoomMin);

        if (zoom < zoomMin) {
          setZoom(zoomMin);
          const scaledImgWidth = img.width * zoomMin;
          const scaledImgHeight = img.height * zoomMin;

          setOffset({
            x: (canvasWidth - scaledImgWidth) / 2,
            y: (canvasHeight - scaledImgHeight) / 2
          });
        }
      } else {
        setZoom(1);
        setZoomMin(1);
        setOffset({ x: 0, y: 0 });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [setZoom, setZoomMin, setOffset, setCanvasDims, zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(zoom, 0, 0, zoom, offset.x, offset.y);

    if (backgroundImageRef.current) {
      ctx.drawImage(backgroundImageRef.current, 0, 0);
    }

    let objectsToRender = objects;
    if (isDragging && draggedObjects.length > 0 && (dragOffset.x !== 0 || dragOffset.y !== 0)) {
      objectsToRender = [...objects];
      const movedObjects = moveObjects(draggedObjects, dragOffset.x, dragOffset.y);
      selectedObjects.forEach((index, i) => {
        if (index < objectsToRender.length && i < movedObjects.length) {
          objectsToRender[index] = movedObjects[i];
        }
      });
    }

    renderCanvas(ctx, objectsToRender, selectedObjects);

    if (isDrawing && startPoint && cursorPosition) {
      drawPreviewShape(ctx, selectedTool, startPoint, cursorPosition, selectedColor, strokeWidth, currentShape as DrawBrush);
    }

    if (cursorPosition && ['brush', 'line', 'arrow'].includes(selectedTool)) {
      drawCursorPreview(ctx, selectedTool, cursorPosition, strokeWidth, zoom);
    }

    ctx.restore();
  }, [objects, selectedObjects, zoom, offset, isDrawing, startPoint, cursorPosition, currentShape, selectedTool, selectedColor, strokeWidth, img, isDragging, draggedObjects, dragOffset]);

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const transformParams: CanvasTransformParams = {
      canvasDims,
      offset,
      zoom
    };

    return mouseToWorld(e.clientX, e.clientY, canvas, transformParams);
  }, [canvasDims, offset, zoom]);

  const worldToScreen = useCallback((worldX: number, worldY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const transformParams: CanvasTransformParams = {
      canvasDims,
      offset,
      zoom
    };

    return canvasWorldToScreen({ x: worldX, y: worldY }, canvas, transformParams);
  }, [canvasDims, offset, zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const point = getMousePos(e);
    const isRightClick = e.button === 2;
    const isMiddleClick = e.button === 1;
    const isCtrlClick = e.ctrlKey && e.button === 0;
    const colorToUse = isRightClick ? secondaryColor : selectedColor;

    if (isCtrlClick || isMiddleClick) {
      return;
    }

    if (selectedTool === 'selection' && selectedObjects.length > 0 && !isRightClick) {
      const isOverSelected = selectedObjects.some(index =>
        index < objects.length && isPointInSelectionBounds(point, objects[index])
      );

      if (isOverSelected) {
        setIsDragging(true);
        setDraggedObjects(selectedObjects.map(index => objects[index]));
        setDragOffset({ x: 0, y: 0 });
        setStartPoint(point);
        return;
      }
    }

    setIsDrawing(true);
    setStartPoint(point);

    const newShape = createToolShape(selectedTool, colorToUse, strokeWidth, fontSize, point);    if (selectedTool === 'parking') {
      if (newShape) {
        const newObjects = [...objects, newShape];
        setObjects(newObjects);
        addToHistory(newObjects);
      }
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentShape(null);    } else if (selectedTool === 'compass') {
      if (newShape) {
        // On utilise le territoire actuel pour calculer la rotation
        try {
          // Importer dynamiquement les utilitaires compass pour éviter des dépendances circulaires
          import('../../../utils/compassUtils').then(({ calculateTerritoryOrientation }) => {
            // Utiliser l'objet territoire complet s'il est disponible, sinon utiliser juste le polygone
            let rotation;
            if (territory && territory.rotation !== undefined) {
              // Utiliser directement la rotation stockée dans l'objet territoire
              rotation = territory.rotation;
            } else if (territoryPolygon && territoryPolygon.length > 0) {
              // Calculer la rotation à partir du polygone
              rotation = calculateTerritoryOrientation(territoryPolygon);
            } else {
              // Aucune information de rotation disponible
              rotation = 0;
            }

            // Mettre à jour l'objet compass avec la rotation calculée
            const compassWithRotation = {
              ...newShape,
              rotation
            };
            const newObjects = [...objects, compassWithRotation];
            setObjects(newObjects);
            addToHistory(newObjects);
          });
        } catch (error) {
          console.warn('Impossible de calculer la rotation du territoire:', error);
          const newObjects = [...objects, newShape];
          setObjects(newObjects);
          addToHistory(newObjects);
        }
      }
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentShape(null);
    } else if (selectedTool === 'text') {
      setCurrentShape(newShape);
      setTextInput('');
      setTextInputScreenPos(worldToScreen(point.x, point.y));
      setShowTextInput(true);
    } else {
      setCurrentShape(newShape);
    }
  }, [selectedTool, selectedColor, secondaryColor, strokeWidth, fontSize, objects, selectedObjects, getMousePos, setIsDrawing, setStartPoint, setCurrentShape, setObjects, addToHistory, setTextInput, setShowTextInput, worldToScreen, setTextInputScreenPos, setIsDragging, setDraggedObjects, setDragOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();

    const point = getMousePos(e);
    setCursorPosition(point);

    if (isDragging && startPoint) {
      const deltaX = point.x - startPoint.x;
      const deltaY = point.y - startPoint.y;
      setDragOffset({ x: deltaX, y: deltaY });
      return;
    }

    if (!isDrawing || !currentShape || !startPoint) return;

    const updatedShape = updateToolShape(selectedTool, currentShape, point);
    if (updatedShape) {
      setCurrentShape(updatedShape);
    }
  }, [isDrawing, isDragging, currentShape, startPoint, selectedTool, getMousePos, setCursorPosition, setCurrentShape, setDragOffset]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      if (dragOffset.x !== 0 || dragOffset.y !== 0) {
        const movedObjects = moveObjects(draggedObjects, dragOffset.x, dragOffset.y);
        const newObjects = [...objects];
        selectedObjects.forEach((index, i) => {
          if (index < newObjects.length && i < movedObjects.length) {
            newObjects[index] = movedObjects[i];
          }
        });

        setObjects(newObjects);
        addToHistory(newObjects);
      }

      setIsDragging(false);
      setDraggedObjects([]);
      setDragOffset({ x: 0, y: 0 });
      setStartPoint(null);
      return;
    }

    if (!isDrawing || !currentShape) return;

    setIsDrawing(false);

    if (selectedTool === 'selection' && currentShape.type === 'selection') {
      const selectedObjs = SelectionTool.getSelectedObjects(currentShape, objects);
      const selectedIndices = selectedObjs.map(obj => objects.indexOf(obj)).filter(index => index !== -1);
      setSelectedObjects(selectedIndices);
    } else if (selectedTool === 'text' && currentShape.type === 'text') {
      return;
    } else {
      const newObjects = [...objects, currentShape];
      setObjects(newObjects);
      addToHistory(newObjects);
    }

    setCurrentShape(null);
    setStartPoint(null);
  }, [isDrawing, isDragging, currentShape, selectedTool, objects, draggedObjects, dragOffset, selectedObjects, setIsDrawing, setObjects, addToHistory, setSelectedObjects, setCurrentShape, setStartPoint, setIsDragging, setDraggedObjects, setDragOffset]);

  const getCursorStyle = useCallback(() => {
    if (isPanning) return 'grabbing';
    if (isDragging) return 'grabbing';

    if (selectedTool === 'selection' && selectedObjects.length > 0 && cursorPosition) {
      const isOverSelected = selectedObjects.some(index =>
        index < objects.length && isPointInSelectionBounds(cursorPosition, objects[index])
      );
      if (isOverSelected) return 'grab';
    }

    return selectedTool === 'selection' ? 'crosshair' : 'crosshair';
  }, [isPanning, isDragging, selectedTool, selectedObjects, cursorPosition, objects]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      e.preventDefault();
      handlePanStart(e);
    }
  }, [handlePanStart]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning && canvasRef.current) {
      e.preventDefault();
      handlePanMove(e, canvasRef as React.RefObject<HTMLCanvasElement>);
    }
  }, [isPanning, handlePanMove]);

  const handlePointerUp = useCallback(() => {
    if (isPanning) {
      handlePanEnd();
    }
  }, [isPanning, handlePanEnd]);

  const handleWheelEvent = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasDims.w / rect.width;
    const scaleY = canvasDims.h / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    handleWheel(e.nativeEvent, canvasX, canvasY);
  }, [handleWheel, canvasDims]);

  const handleTextSubmit = useCallback(() => {
    if (!currentShape || currentShape.type !== 'text' || !textInput.trim()) {
      setShowTextInput(false);
      setCurrentShape(null);
      setTextInputScreenPos(null);
      return;
    }

    const updatedText = TextTool.updateContent(currentShape, textInput);
    const newObjects = [...objects, updatedText];
    setObjects(newObjects);
    addToHistory(newObjects);

    setShowTextInput(false);
    setCurrentShape(null);
    setTextInput('');
    setTextInputScreenPos(null);
  }, [currentShape, textInput, objects, setObjects, addToHistory, setShowTextInput, setCurrentShape, setTextInput, setTextInputScreenPos]);

  const handleTextCancel = useCallback(() => {
    setShowTextInput(false);
    setCurrentShape(null);
    setTextInput('');
    setTextInputScreenPos(null);
  }, [setShowTextInput, setCurrentShape, setTextInput, setTextInputScreenPos]);

  const handleClear = useCallback(() => {
    const filteredObjects = objects.filter(
      (_, index) => !selectedObjects.includes(index)
    );
    setObjects(filteredObjects);
    setSelectedObjects([]);
    addToHistory(filteredObjects);
  }, [objects, selectedObjects, setObjects, setSelectedObjects, addToHistory]);

  const handleExport = useCallback(async () => {
    if (!onSave) return;

    try {
      const paintLayers = objects
        .map(LayerService.convertDrawObjectToLayer)
        .filter((layer): layer is PaintLayer => layer !== null);

      const canvas = canvasRef.current;
      if (!canvas) {
        onSave(paintLayers);
        return;
      }

      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;

      if (img) {
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);
      } else {
        tempCanvas.width = canvasDims.w;
        tempCanvas.height = canvasDims.h;
      }

      objects.forEach((obj) => {
        if (obj.type === 'selection') return;
        drawToolShape(tempCtx, obj);
      });

      const compositeImage = tempCanvas.toDataURL('image/png');
      onSave(paintLayers, compositeImage);
    } catch (error) {
      console.error('[Paint] Error exporting canvas:', error);
      const paintLayers = objects
        .map(LayerService.convertDrawObjectToLayer)
        .filter((layer): layer is PaintLayer => layer !== null);
      onSave(paintLayers);
    }
  }, [onSave, objects, img, canvasDims]);

  const handleHistoryChange = useCallback((newObjects: DrawObject[] | null) => {
    if (newObjects !== null) {
      setObjects(newObjects);
      setSelectedObjects([]);
    }
  }, [setObjects, setSelectedObjects]);

  const handleUndo = useCallback(() => {
    handleHistoryChange(undo());
  }, [handleHistoryChange, undo]);

  const handleRedo = useCallback(() => {
    handleHistoryChange(redo());
  }, [handleHistoryChange, redo]);

  const handleCropApply = useCallback((cropData: {
    x: number;
    y: number;
    width: number;
    height: number;
    imageWidth: number;
    imageHeight: number;
  }) => {
    if (onCrop) {
      onCrop(cropData);
    }
    setOnCropping(false);
  }, [onCrop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showTextInput) return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              if (canRedo) handleRedo();
            } else {
              if (canUndo) handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            if (canRedo) handleRedo();
            break;
        }
      }

      if (e.key === 'Escape') {
        setSelectedObjects([]);
        setSelectedTool('selection');
      }

      if (e.key === 'Delete' && selectedObjects.length > 0) {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTextInput, canUndo, canRedo, handleUndo, handleRedo, selectedObjects, handleClear, setSelectedObjects, setSelectedTool]);

  return (
    <div className="flex w-full h-full min-w-0">
      <div className="flex-1 flex flex-col relative min-w-0">
        <div ref={containerRef} className="flex-1 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setCursorPosition(null)}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheelEvent}
            className="border-r border-gray-300 w-full"
            style={{
              cursor: getCursorStyle(),
              display: 'block',
              maxWidth: 'none',
              maxHeight: 'none'
            }}
          />
          {showTextInput && currentShape?.type === 'text' && textInputScreenPos && (
            <TextInputComponent
              screenPos={textInputScreenPos}
              textInput={textInput}
              fontSize={fontSize}
              zoom={zoom}
              onTextChange={setTextInput}
              onSubmit={handleTextSubmit}
              onCancel={handleTextCancel}
            />
          )}
        </div>
      </div>

      <div className="w-50 min-w-50 p-4 flex flex-col justify-between flex-shrink-0">
        <div className='space-y-4'>
          <ToolBar
            tools={TOOLS}
            selectedTool={selectedTool}
            onToolSelect={setSelectedTool}
          />

          <SeparatorX />

          <ColorPickers
            selectedColor={selectedColor}
            onColorChange={setSelectedColor}
            secondaryColor={secondaryColor}
            onSecondaryColorChange={setSecondaryColor}
          />
          <SeparatorX />

          {selectedTool === 'text' ? (
            <NumericInput
              label="Taille police"
              value={fontSize}
              setValue={setFontSize}
              min={8}
              max={72}
              step={1}
              unit="px"
            />
          ) : (
            <NumericInput
              label="Épaisseur"
              value={strokeWidth}
              setValue={setStrokeWidth}
              min={1}
              max={20}
              step={1}
              unit="px"
            />
          )}
        </div>

        <ActionButtons
          canUndo={canUndo}
          canRedo={canRedo}
          selectedObjectsLength={selectedObjects.length}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onExport={handleExport}
          isLarge={isLarge}
          onGoCrop={() => setOnCropping(true)}
        />
        <Cropper
          src={src!}
          open={onCropping}
          onClose={() => setOnCropping(false)}
          onApply={handleCropApply}
        />
      </div>
    </div>
  );
};

export default Paint;
