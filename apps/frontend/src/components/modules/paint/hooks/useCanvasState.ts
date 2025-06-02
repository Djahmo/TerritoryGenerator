import { useState, useCallback } from "react"
import { clampOffset, calculateMinZoom } from "../utils/canvasUtils"
import type { PanStart, DrawObject } from "../utils/types"
import { MAX_ZOOM, ZOOM_FACTOR } from "../utils/constants"

// Hook for managing canvas state (objects, selection, zoom, pan, offset)

export const useCanvasState = () => {
  // Objects state
  const [objects, setObjects] = useState<DrawObject[]>([])
  const [selectedObjects, setSelectedObjects] = useState<number[]>([])

  // Canvas state
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [canvasDims, setCanvasDims] = useState({ w: 800, h: 600 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<PanStart | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [zoomMin, setZoomMin] = useState(1)
    const handleWheel = useCallback((e: WheelEvent, mouseX: number, mouseY: number) => {
    e.preventDefault()

    if (!img) return    // Coordonnées du monde au point de la souris AVANT zoom
    const wx = (mouseX - offset.x) / zoom
    const wy = (mouseY - offset.y) / zoom

    const zoomAmount = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR

    // Utiliser le zoomMin déjà calculé au lieu de recalculer dynamiquement
    const nextZoom = Math.max(zoomMin, Math.min(MAX_ZOOM, zoom * zoomAmount))

    // Calculer le nouvel offset pour maintenir wx,wy sous la souris
    let newOffset = {
      x: mouseX - wx * nextZoom,
      y: mouseY - wy * nextZoom
    }// Appliquer le clamping pour s'assurer que les bords de l'image restent à l'extérieur du canvas
    newOffset = clampOffset(newOffset, nextZoom, img, canvasDims)

    setZoom(nextZoom)
    setOffset(newOffset)
  }, [img, offset, zoom, zoomMin, canvasDims])

  const handlePanStart = useCallback((e: React.PointerEvent) => {
    setIsPanning(true)
    setPanStart({
      x: e.clientX,
      y: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y
    })
  }, [offset])

  const handlePanMove = useCallback((e: React.PointerEvent, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    if (!isPanning || !panStart || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasDims.w / rect.width
    const scaleY = canvasDims.h / rect.height

    const dx = (e.clientX - panStart.x) * scaleX
    const dy = (e.clientY - panStart.y) * scaleY
    const newOffset = clampOffset({
      x: panStart.offsetX + dx,
      y: panStart.offsetY + dy
    }, zoom, img, canvasDims)
    setOffset(newOffset)
  }, [isPanning, panStart, zoom, img, canvasDims])

  const handlePanEnd = useCallback(() => {
    setIsPanning(false)
    setPanStart(null)
  }, [])
  const resetZoom = useCallback((newImg: HTMLImageElement, canvasWidth: number, canvasHeight: number) => {
    const zoomMinCalc = calculateMinZoom(newImg, { w: canvasWidth, h: canvasHeight })
    setZoomMin(zoomMinCalc)
    setZoom(zoomMinCalc)

    const scaledImgWidth = newImg.width * zoomMinCalc
    const scaledImgHeight = newImg.height * zoomMinCalc

    setOffset({
      x: (canvasWidth - scaledImgWidth) / 2,
      y: (canvasHeight - scaledImgHeight) / 2
    })
  }, [])

  return {
    // Objects state
    objects,
    selectedObjects,
    setObjects,
    setSelectedObjects,

    // Canvas state
    img,
    canvasDims,
    setImg,
    setCanvasDims,

    // Pan/zoom state
    isPanning,
    panStart,
    offset,
    zoom,
    zoomMin,
    setOffset,
    setZoom,
    setZoomMin,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    resetZoom
  }
}
