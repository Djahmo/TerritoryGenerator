import React, { useRef, useEffect, useState } from "react"

type PaintProps = {
  src: string
  width?: number   // largeur affichée
  height?: number  // hauteur affichée
}

const Paint: React.FC<PaintProps> = ({ src, width = 900, height = 600 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [canvasDims, setCanvasDims] = useState({ w: width, h: height || width })

  const [isDrawing, setIsDrawing] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ x: number, y: number, offsetX: number, offsetY: number } | null>(null)
  const [lastPos, setLastPos] = useState<[number, number] | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [zoomMin, setZoomMin] = useState(1)

  useEffect(() => {
    const image = new window.Image()
    image.onload = () => {
      setImg(image)
      setImgLoaded(true)
      const imgRatio = image.height / image.width
      const dispW = width
      const dispH = height || Math.round(width * imgRatio)
      setCanvasDims({ w: dispW, h: dispH })

      const zoomMinCalc = Math.max(dispW / image.width, dispH / image.height)
      setZoomMin(zoomMinCalc)
      setZoom(zoomMinCalc)
      setOffset({ x: 0, y: 0 })
    }
    image.src = src
  }, [src, width, height])

  useEffect(() => {
    if (!canvasRef.current || !img) return
    const ctx = canvasRef.current.getContext("2d")!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvasDims.w, canvasDims.h)

    ctx.setTransform(zoom, 0, 0, zoom, offset.x, offset.y)
    ctx.drawImage(img, 0, 0, img.width, img.height)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }, [img, imgLoaded, canvasDims, offset, zoom])

  const getLogicalCoords = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = ((e.clientX - rect.left) * canvasDims.w / rect.width)
    const y = ((e.clientY - rect.top) * canvasDims.h / rect.height)
    const lx = (x - offset.x) / zoom
    const ly = (y - offset.y) / zoom
    return [lx, ly] as [number, number]
  }

  // Dessin sur la bonne couche
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.nativeEvent.button === 1 || e.nativeEvent.ctrlKey) {
      setIsPanning(true)
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        offsetX: offset.x,
        offsetY: offset.y
      })
      return
    }
    setIsDrawing(true)
    setLastPos(getLogicalCoords(e))
  }

  const handlePointerUp = () => {
    setIsDrawing(false)
    setIsPanning(false)
    setLastPos(null)
    setPanStart(null)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning && panStart) {
      const dx = (e.clientX - panStart.x) * zoom
      const dy = (e.clientY - panStart.y) * zoom
      const newOffset = clampOffset({
        x: panStart.offsetX + dx,
        y: panStart.offsetY + dy
      }, zoom)
      setOffset(newOffset)
      return
    }
    if (!isDrawing || !canvasRef.current || !img) return
    const ctx = canvasRef.current.getContext("2d")!
    ctx.save()
    ctx.setTransform(zoom, 0, 0, zoom, offset.x, offset.y)
    ctx.strokeStyle = "black"
    ctx.lineWidth = 2
    ctx.lineJoin = "round"
    ctx.lineCap = "round"
    ctx.beginPath()
    const pos = getLogicalCoords(e)
    if (lastPos) ctx.moveTo(lastPos[0], lastPos[1])
    ctx.lineTo(pos[0], pos[1])
    ctx.stroke()
    ctx.restore()
    setLastPos(pos)
  }

  // Clamp pan pour pas sortir du cadre
  const clampOffset = (offset: { x: number, y: number }, zoom: number) => {
    if (!img) return offset
    const { w, h } = canvasDims
    let minX = Math.min(0, w - img.width * zoom)
    let maxX = 0
    let minY = Math.min(0, h - img.height * zoom)
    let maxY = 0
    return {
      x: Math.max(minX, Math.min(maxX, offset.x)),
      y: Math.max(minY, Math.min(maxY, offset.y))
    }
  }

  // Wheel (zoom sur le point souris)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !img) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const mouseX = (e.clientX - rect.left) * canvasDims.w / rect.width
      const mouseY = (e.clientY - rect.top) * canvasDims.h / rect.height
      const wx = (mouseX - offset.x) / zoom
      const wy = (mouseY - offset.y) / zoom

      const zoomAmount = e.deltaY < 0 ? 1.1 : 0.9
      let nextZoom = Math.max(zoomMin, Math.min(10, zoom * zoomAmount))
      let newOffset = {
        x: mouseX - wx * nextZoom,
        y: mouseY - wy * nextZoom
      }
      setZoom(nextZoom)
      setOffset(clampOffset(newOffset, nextZoom))
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false })
    return () => canvas.removeEventListener("wheel", handleWheel)
  }, [canvasRef, img, offset, zoom, zoomMin, canvasDims])

  // Pan: Arrêter si on relâche la souris hors du canvas
  useEffect(() => {
    const handleMouseUp = () => setIsPanning(false)
    window.addEventListener("pointerup", handleMouseUp)
    return () => window.removeEventListener("pointerup", handleMouseUp)
  }, [])

  // Export image du canvas
  const handleExport = () => {
    if (!canvasRef.current) return
    const url = canvasRef.current.toDataURL("image/png")
    const a = document.createElement("a")
    a.href = url
    a.download = "territory_painted.png"
    a.click()
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="border border-muted/50 rounded-lg shadow-lg relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={canvasDims.w}
          height={canvasDims.h}
          className="max-w-full h-auto transition-shadow duration-200 touch-none block"
          style={{
            cursor: isPanning ? "grab" : isDrawing ? "crosshair" : "default",
            userSelect: "none",
            background: "#fafafd"
          }}
          onContextMenu={e => e.preventDefault()}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerOut={handlePointerUp}
          onPointerMove={handlePointerMove}
        />
      </div>
      <div className="flex gap-2">
        <button className="btn btn-secondary" onClick={handleExport}>Exporter PNG</button>
        <span className="text-gray-400 text-xs">(Ctrl+Clic = Pan, Molette = Zoom, brush noir)</span>
      </div>
    </div>
  )
}

export default Paint
