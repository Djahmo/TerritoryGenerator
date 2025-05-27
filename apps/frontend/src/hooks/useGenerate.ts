import { useState, useCallback, useRef, useEffect } from "react"
import type { Coord, Territory } from "%/types"
import { ppp, finalWidth, finalHeight, rawSize, PHI } from "&/useConfig"

// Constantes d'origine

const getBbox = (polygon: Coord[], planLarge = false) => {
  const lats = polygon.map(p => p.lat)
  const lons = polygon.map(p => p.lon)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)

  const diag = Math.hypot(maxLat - minLat, maxLon - minLon)
  const centerLat = (minLat + maxLat) / 2
  const centerLon = (minLon + maxLon) / 2

  let size
  if (planLarge) {
    size = diag / 0.2
  } else {
    const factor = (200 / ppp) * 1.2
    if (diag < 0.01 / factor) {
      size = 0.01618 / factor
    } else {
      size = Math.round(diag * PHI * 100000) / 100000
    }
  }

  return [
    centerLon - size / 2,
    centerLat - size / 2,
    centerLon + size / 2,
    centerLat + size / 2
  ]
}

const fetchWithRetry = async (url: string, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`)
      return res
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise(r => setTimeout(r, delay))
    }
  }
}

const convexHull = (points: [number, number][]) => {
  const cross = ([x0, y0]: number[], [x1, y1]: number[], [x2, y2]: number[]) =>
    (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0)
  points = points.slice().sort(([x1, y1], [x2, y2]) => x1 - x2 || y1 - y2)
  const lower: [number, number][] = []
  for (const p of points) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: [number, number][] = []
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  upper.pop()
  lower.pop()
  return lower.concat(upper)
}

const gpsToPixel = (lat: number, lon: number, bbox: number[]) => {
  const [minLon, minLat, maxLon, maxLat] = bbox
  const x = ((lon - minLon) / (maxLon - minLon)) * rawSize
  const y = ((maxLat - lat) / (maxLat - minLat)) * rawSize
  return [x, y] as [number, number]
}

const rotatePoint = ([x, y]: [number, number], angle: number, cx: number, cy: number) => {
  const dx = x - cx, dy = y - cy
  return [
    dx * Math.cos(angle) - dy * Math.sin(angle) + cx,
    dx * Math.sin(angle) + dy * Math.cos(angle) + cy
  ] as [number, number]
}

const drawMask = (
  ctx: CanvasRenderingContext2D,
  poly: [number, number][],
  width: number,
  height: number,
  planLarge: boolean,
  color = 'grey',
  alpha = 0.55
) => {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.beginPath()
  if (planLarge) {
    ctx.moveTo(poly[0][0], poly[0][1])
    poly.forEach(([x, y]) => ctx.lineTo(x, y))
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  } else {
    ctx.rect(0, 0, width, height)
    ctx.moveTo(poly[0][0], poly[0][1])
    poly.forEach(([x, y]) => ctx.lineTo(x, y))
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill('evenodd')
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

const drawContour = (
  ctx: CanvasRenderingContext2D,
  poly: [number, number][],
  color = 'red',
  width = 8
) => {
  ctx.save()
  ctx.beginPath()
  poly.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.stroke()
  ctx.restore()
}

const generateImageWeb = async (territoire: Territory, { contourColor = 'red', contourWidth = 8 } = {}): Promise<{ miniature: string, image: string }> => {
  const bbox = getBbox(territoire.polygon, false)
  const url = `https://data.geopf.fr/wms-r?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap`
    + `&LAYERS=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLES=&CRS=EPSG:4326`
    + `&BBOX=${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]}`
    + `&WIDTH=${rawSize}&HEIGHT=${rawSize}&FORMAT=image/png`
  const res = await fetchWithRetry(url)
  const blob = await res!.blob()
  const img = await createImageBitmap(blob)

  const polyPx = territoire.polygon.map(p => gpsToPixel(p.lat, p.lon, bbox))
  const hull = convexHull(polyPx)

  let angle = 0
  let best = { scale: -Infinity, angle: 0, center: [0, 0], hull: [] as [number, number][] }
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length]
    const testAngle = -Math.atan2(b[1] - a[1], b[0] - a[0])
    const cx = rawSize / 2, cy = rawSize / 2
    const hullRot = hull.map(pt => rotatePoint(pt, testAngle, cx, cy))
    const xs = hullRot.map(p => p[0]), ys = hullRot.map(p => p[1])
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
    const w = maxX - minX, h = maxY - minY
    const scale = Math.min(finalWidth / w, finalHeight / h)
    if (scale > best.scale) {
      best = { scale, angle: testAngle, center: [(minX + maxX) / 2, (minY + maxY) / 2], hull: hullRot }
    }
  }
  angle = best.angle

  const canvas = document.createElement('canvas')
  canvas.width = rawSize
  canvas.height = rawSize
  const ctx = canvas.getContext('2d')!

  ctx.save()
  ctx.translate(rawSize / 2, rawSize / 2)
  ctx.rotate(angle)
  ctx.drawImage(img, -rawSize / 2, -rawSize / 2)
  ctx.restore()

  let minX, minY, cropW, cropH, cropAngle

  const xs = best.hull.map(p => p[0]), ys = best.hull.map(p => p[1])
  const maxX = Math.max(...xs), minX_ = Math.min(...xs)
  const maxY = Math.max(...ys), minY_ = Math.min(...ys)
  let w = maxX - minX_, h = maxY - minY_
  let cx = (minX_ + maxX) / 2, cy = (minY_ + maxY) / 2
  let targetRatio = finalWidth / finalHeight
  cropW = w
  cropH = h
  if (w / h > targetRatio) {
    cropH = w / targetRatio
  } else {
    cropW = h * targetRatio
  }
  cropW = cropW || w
  cropH = cropH || h
  minX = cx - cropW / 2
  minY = cy - cropH / 2
  cropAngle = angle

  // Crop/resize
  let finalCanvas = document.createElement('canvas')
  finalCanvas.width = finalWidth
  finalCanvas.height = finalHeight
  const finalCtx = finalCanvas.getContext('2d')!
  finalCtx.drawImage(
    canvas,
    minX, minY, cropW, cropH,
    0, 0, finalWidth, finalHeight
  )

  const cx2 = rawSize / 2, cy2 = rawSize / 2
  const polyFinal = polyPx.map(([x, y]) => {
    const [xr, yr] = rotatePoint([x, y], cropAngle, cx2, cy2)
    const xf = ((xr - minX) * finalWidth) / cropW
    const yf = ((yr - minY) * finalHeight) / cropH
    return [xf, yf] as [number, number]
  })

  drawMask(finalCtx, polyFinal, finalWidth, finalHeight, false)
  drawContour(finalCtx, polyFinal, contourColor, contourWidth)

  const isUpsideDown = Math.abs(Math.abs(angle) - Math.PI) < Math.PI / 2
  if (isUpsideDown) {
    let tempCanvas = document.createElement('canvas')
    tempCanvas.width = finalWidth
    tempCanvas.height = finalHeight
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.translate(finalWidth / 2, finalHeight / 2)
    tempCtx.rotate(Math.PI)
    tempCtx.drawImage(finalCanvas, -finalWidth / 2, -finalHeight / 2)
    finalCanvas = tempCanvas
  }

  const image = finalCanvas.toDataURL('image/png')

  const minHeight = Math.round(finalHeight / finalWidth * 500)
  const miniature = await loadMiniature(image, 500, minHeight)

  return { miniature, image }
}

const generateLargeWeb = async (territoire: Territory, { contourColor = 'red', contourWidth = 8 } = {}): Promise<string> => {
  const bbox = getBbox(territoire.polygon, true)
  const url = `https://data.geopf.fr/wms-r?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap`
    + `&LAYERS=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLES=&CRS=EPSG:4326`
    + `&BBOX=${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]}`
    + `&WIDTH=${rawSize}&HEIGHT=${rawSize}&FORMAT=image/png`
  const res = await fetchWithRetry(url)
  const blob = await res!.blob()
  const img = await createImageBitmap(blob)

  const polyPx = territoire.polygon.map(p => gpsToPixel(p.lat, p.lon, bbox))

  const canvas = document.createElement('canvas')
  canvas.width = rawSize
  canvas.height = rawSize
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  let minX = 0, minY = 0, cropW = rawSize, cropH = rawSize

  let finalCanvas = document.createElement('canvas')
  finalCanvas.width = finalWidth
  finalCanvas.height = finalHeight
  const finalCtx = finalCanvas.getContext('2d')!
  finalCtx.drawImage(
    canvas,
    minX, minY, cropW, cropH,
    0, 0, finalWidth, finalHeight
  )

  const polyFinal = polyPx.map(([x, y]) => {
    let [xr, yr] = [x, y]
    const xf = ((xr - minX) * finalWidth) / cropW
    const yf = ((yr - minY) * finalHeight) / cropH
    return [xf, yf] as [number, number]
  })

  drawMask(finalCtx, polyFinal, finalWidth, finalHeight, true)
  drawContour(finalCtx, polyFinal, contourColor, contourWidth)

  return finalCanvas.toDataURL('image/png')
}

const loadMiniature = (src: string, cropWidth: number, cropHeight: number): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height
      const ratio = img.width / img.height
      const targetRatio = cropWidth / cropHeight
      if (ratio < targetRatio) {
        sHeight = img.width / targetRatio
        sy = (img.height - sHeight) / 2
      }

      const cropCanvas = document.createElement("canvas")
      cropCanvas.width = cropWidth
      cropCanvas.height = cropHeight
      const cropCtx = cropCanvas.getContext("2d")!
      cropCtx.imageSmoothingEnabled = true
      cropCtx.imageSmoothingQuality = "high"
      cropCtx.drawImage(
        img,
        sx, sy, sWidth, sHeight,
        0, 0, cropWidth, cropHeight
      )

      const finalWidth = 300
      const finalHeight = Math.round((cropHeight / cropWidth) * finalWidth)
      const smallCanvas = document.createElement("canvas")
      smallCanvas.width = finalWidth
      smallCanvas.height = finalHeight
      const smallCtx = smallCanvas.getContext("2d")!
      smallCtx.imageSmoothingEnabled = true
      smallCtx.imageSmoothingQuality = "high"
      smallCtx.drawImage(
        cropCanvas,
        0, 0, cropWidth, cropHeight,
        0, 0, finalWidth, finalHeight
      )

      resolve(smallCanvas.toDataURL("image/png"))
    }
    img.onerror = reject
    img.src = src
  })

export const useGenerate = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const defaultImageRef = useRef<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        if (!defaultImageRef.current) {
          defaultImageRef.current = await loadMiniature("/images/default.png", finalWidth, finalHeight)
        }
        return defaultImageRef.current
      }
      catch (e: any) {
        setError(`Erreur lors du chargement de l'image par défaut: ${e.message}`)
      }
    })()
  }, [])

const generateImages = useCallback(async (territorys: Territory[], callBack: (territorys: Territory[]) => void) => {
  setLoading(true)
  setError(null)

  const defaultImage = defaultImageRef.current!
  const out: Territory[] = [...territorys.map(t => ({
    ...t,
    miniature: defaultImage,
    image: '',
    imagelarge: '',
    isDefault: true
  }))]
  callBack([...out])

  const promises = territorys.map((territory, i) =>
    new Promise<void>((resolve) => {
      setTimeout(() => {
        generateImageWeb(territory)
          .then(img => {
            const t = out.find(t => t.num === territory.num)
            if (t) {
              t.image = img.image
              t.miniature = img.miniature
              t.isDefault = false
            }
            callBack([...out])
          })
          .finally(() => resolve())
      }, i * 25)
    })
  )

  await Promise.all(promises)
  setLoading(false)
}, [])


  return { loading, error, generateImages }
}
