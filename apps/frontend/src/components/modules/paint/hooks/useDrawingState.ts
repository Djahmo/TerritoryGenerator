import { useState, useCallback } from "react"
import type { ToolType, Point, DrawObject } from "../utils/types"
import { MIN_STROKE_WIDTH, MAX_STROKE_WIDTH } from "../utils/constants"

// Hook for managing drawing state

export const useDrawingState = () => {  // Tool and style state
  const [selectedTool, setSelectedTool] = useState<ToolType>('brush')
  const [selectedColor, setSelectedColor] = useState("#000000")
  const [secondaryColor, setSecondaryColor] = useState("#ffffff")
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [fontSize, setFontSize] = useState(16)
    // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<any[]>([])
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [startPoint, setStartPoint] = useState<Point | null>(null)
  const [currentShape, setCurrentShape] = useState<DrawObject | null>(null)
  const [cursorPosition, setCursorPosition] = useState<Point | null>(null)

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false)
  const [draggedObjects, setDraggedObjects] = useState<DrawObject[]>([])
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 })

  // Text state
  const [textInput, setTextInput] = useState("")
  const [showTextInput, setShowTextInput] = useState(false)

  // UI state
  const [showColorPicker, setShowColorPicker] = useState(false)
  const handleToolChange = useCallback((tool: ToolType) => {
    setSelectedTool(tool)
    setIsDrawing(false)
    setCurrentPath([])
    setDragStart(null)
    setStartPoint(null)
    setCurrentShape(null)
    setShowTextInput(false)
    setIsDragging(false)
    setDraggedObjects([])
  }, [])

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color)
  }, [])

  const handleStrokeWidthChange = useCallback((width: number) => {
    setStrokeWidth(Math.max(MIN_STROKE_WIDTH, Math.min(MAX_STROKE_WIDTH, width)))
  }, [])

  const handleFontSizeChange = useCallback((size: number) => {
    setFontSize(Math.max(8, Math.min(72, size)))
  }, [])

  return {
    // Tool and style state
    selectedTool,
    setSelectedTool,
    selectedColor,
    setSelectedColor,
    strokeWidth,
    setStrokeWidth,
    fontSize,
    setFontSize,

    // Drawing state
    isDrawing,
    setIsDrawing,
    currentPath,
    setCurrentPath,
    dragStart,
    setDragStart,
    startPoint,
    setStartPoint,
    currentShape,
    setCurrentShape,
    cursorPosition,
    setCursorPosition,

    // Drag and drop state
    isDragging,
    setIsDragging,
    draggedObjects,
    setDraggedObjects,
    dragOffset,
    setDragOffset,

    // Text state
    textInput,
    setTextInput,
    showTextInput,
    setShowTextInput,

    // UI state
    showColorPicker,
    setShowColorPicker,

    // Colors
    secondaryColor,
    setSecondaryColor,

    // Actions
    handleToolChange,
    handleColorChange,
    handleStrokeWidthChange,
    handleFontSizeChange
  }}
