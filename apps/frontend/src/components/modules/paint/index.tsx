import React, { useRef, useEffect, useCallback, useState } from 'react';
import { TOOLS } from './utils/constants';
import { Point, DrawObject, DrawBrush } from './utils/types';
import { useHistory, useCanvasState, useDrawingState } from './hooks';
import { ToolBar, ColorPickers, ActionButtons, NumericInput } from './components';
import { drawPreviewShape, drawCursorPreview, renderCanvas } from './utils/previewUtils';
import { moveObjects } from './utils/dragUtils';
import { isPointInSelectionBounds } from './utils/selectionUtils';
import { calculateMinZoom, mouseToWorld, worldToScreen as canvasWorldToScreen, CanvasTransformParams } from './utils/canvasUtils';
import { createToolShape, updateToolShape } from './utils/toolFactory';
import {
  SelectionTool,
  TextTool,
  TextInputComponent
} from './tools';
import SeparatorX from '../../ui/SeparatorX';

interface PaintProps {
  src?: string;
  onSave?: (imageData: string) => void;
}

const Paint: React.FC<PaintProps> = ({ src }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);

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
  // Image loading effect
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    if (!src) {
      // Pas d'image source, initialiser avec dimensions par défaut
      backgroundImageRef.current = null;
      setImg(null);

      const containerRect = container.getBoundingClientRect();
      const canvasWidth = containerRect.width;
      const canvasHeight = Math.round(canvasWidth * 0.75); // Ratio 4:3 par défaut

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
      const canvasHeight = Math.round((canvasWidth * img.height) / img.width);

      setCanvasDims({ w: canvasWidth, h: canvasHeight });
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;

      const zoomMin = calculateMinZoom(img, { w: canvasWidth, h: canvasHeight });
      setZoomMin(zoomMin);
      setZoom(zoomMin);

      // Centre l'image seulement lors du chargement initial
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

      // En cas d'erreur, utiliser les dimensions par défaut
      const containerRect = container.getBoundingClientRect();
      const canvasWidth = containerRect.width;
      const canvasHeight = Math.round(canvasWidth * 0.75);

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

      // Si on a une image, utiliser son ratio
      if (backgroundImageRef.current) {
        const img = backgroundImageRef.current;
        canvasHeight = Math.round((canvasWidth * img.height) / img.width);
      } else {
        canvasHeight = Math.round(canvasWidth * 0.75);
      }

      setCanvasDims({ w: canvasWidth, h: canvasHeight });
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;      if (backgroundImageRef.current) {
        const img = backgroundImageRef.current;
        const zoomMin = calculateMinZoom(img, { w: canvasWidth, h: canvasHeight });
        setZoomMin(zoomMin);

        if (zoom < zoomMin) {
          setZoom(zoomMin);
          // Seulement centrer si on doit réajuster le zoom au minimum
          const scaledImgWidth = img.width * zoomMin;
          const scaledImgHeight = img.height * zoomMin;

          setOffset({
            x: (canvasWidth - scaledImgWidth) / 2,
            y: (canvasHeight - scaledImgHeight) / 2
          });
        }
        // Si le zoom actuel est valide, on garde l'offset existant
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
  }, [canvasDims, offset, zoom]);const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const point = getMousePos(e);
    const isRightClick = e.button === 2;
    const isMiddleClick = e.button === 1;
    const isCtrlClick = e.ctrlKey && e.button === 0;
    const colorToUse = isRightClick ? secondaryColor : selectedColor;

    if (isCtrlClick || isMiddleClick) {
      return;
    }    if (selectedTool === 'selection' && selectedObjects.length > 0 && !isRightClick) {
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
    }    setIsDrawing(true);
    setStartPoint(point);

    // Utilisation de la factory function pour créer l'outil
    const newShape = createToolShape(selectedTool, colorToUse, strokeWidth, fontSize, point);
    
    if (selectedTool === 'parking') {
      // Cas spécial pour le parking - ajout immédiat aux objets
      if (newShape) {
        const newObjects = [...objects, newShape];
        setObjects(newObjects);
        addToHistory(newObjects);
      }
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentShape(null);
    } else if (selectedTool === 'text') {
      // Cas spécial pour le texte - configuration de l'input
      setCurrentShape(newShape);
      setTextInput('');
      setTextInputScreenPos(worldToScreen(point.x, point.y));
      setShowTextInput(true);
    } else {
      // Cas standard pour tous les autres outils
      setCurrentShape(newShape);
    }
  }, [selectedTool, selectedColor, secondaryColor, strokeWidth, fontSize, objects, selectedObjects, getMousePos, setIsDrawing, setStartPoint, setCurrentShape, setObjects, addToHistory, setTextInput, setShowTextInput, worldToScreen, setTextInputScreenPos, setIsDragging, setDraggedObjects, setDragOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();

    const point = getMousePos(e);
    setCursorPosition(point);

    // Handle dragging selected objects
    if (isDragging && startPoint) {
      const deltaX = point.x - startPoint.x;
      const deltaY = point.y - startPoint.y;
      setDragOffset({ x: deltaX, y: deltaY });
      return;
    }    if (!isDrawing || !currentShape || !startPoint) return;

    // Utilisation de la factory function pour mettre à jour l'outil
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
  }, [isDrawing, isDragging, currentShape, selectedTool, objects, draggedObjects, dragOffset, selectedObjects, setIsDrawing, setObjects, addToHistory, setSelectedObjects, setCurrentShape, setStartPoint, setIsDragging, setDraggedObjects, setDragOffset]);  // Function to determine cursor style

  const getCursorStyle = useCallback(() => {
    // Panning has highest priority
    if (isPanning) return 'grabbing';

    // Object dragging has second priority
    if (isDragging) return 'grabbing';    // Selection tool: show 'grab' cursor when hovering over selected objects
    if (selectedTool === 'selection' && selectedObjects.length > 0 && cursorPosition) {
      const isOverSelected = selectedObjects.some(index =>
        index < objects.length && isPointInSelectionBounds(cursorPosition, objects[index])
      );
      if (isOverSelected) return 'grab';
    }

    return selectedTool === 'selection' ? 'crosshair' : 'crosshair';
  }, [isPanning, isDragging, selectedTool, selectedObjects, cursorPosition, objects]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) { // Middle mouse or Ctrl+left click
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
  }, [isPanning, handlePanEnd]);  const handleWheelEvent = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasDims.w / rect.width;
    const scaleY = canvasDims.h / rect.height;

    // Coordonnées dans l'espace du canvas (avant transformation zoom/offset)
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;    handleWheel(e.nativeEvent, canvasX, canvasY);
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

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'canvas-export.png';
      link.href = dataURL;
      link.click();
    } catch (error) {
      console.error('Error exporting canvas:', error);
    }
  }, []);

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

      <div className="w-64 min-w-64 p-4 flex flex-col justify-between flex-shrink-0">
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
          />          <SeparatorX />

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
        />
      </div>
    </div>
  );
};

export default Paint;
