import { useState, useEffect, useCallback } from "react"

const PHI = (1 + Math.sqrt(5)) / 2
const CONFIG_KEY = "paint-config-v1"

export type Config = {
  // Configuration du canvas/papier
  ppp: number
  paperWidth: number
  ratioX: number
  ratioY: number
  palette: string[]
  
  // Configuration de génération d'images
  contourColor: string
  contourWidth: number
  
  // Configuration des miniatures
  thumbnailWidth: number
  
  // Configuration réseau
  networkRetries: number
  networkDelay: number
  ignApiRateLimit: number
  
  // Configuration API IGN
  ignApiBaseUrl: string
  ignApiLayer: string
  ignApiFormat: string
  ignApiCRS: string
}

const defaultConfig: Config = {
  // Configuration du canvas/papier
  ppp: 250,
  paperWidth: 29.7,
  ratioX: 1.41,
  ratioY: 1,
  palette: [
    "rgba(0,0,0,1)", "rgba(50,75,95,1)", "rgba(0,174,239,1)", "rgba(0,128,0,1)",
    "rgba(255,0,0,1)", "rgba(255,165,0,1)", "rgba(255,255,0,1)",
  ],
  
  // Configuration de génération d'images
  contourColor: 'red',
  contourWidth: 8,
  
  // Configuration des miniatures
  thumbnailWidth: 500,
  
  // Configuration réseau
  networkRetries: 3,
  networkDelay: 1000,
  ignApiRateLimit: 40, // 40ms entre chaque requête vers l'API IGN pour plus de sécurité
  
  // Configuration API IGN
  ignApiBaseUrl: 'https://data.geopf.fr/wms-r',
  ignApiLayer: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
  ignApiFormat: 'image/png',
  ignApiCRS: 'EPSG:4326'
}

const getResolution = (
  pW: number, rX: number, rY: number, p: number
): { widthPx: number; heightPx: number } => {
  const heightCm = pW * (rY / rX)
  const widthPx = Math.round((pW / 2.54) * p)
  const heightPx = Math.round((heightCm / 2.54) * p)
  return { widthPx, heightPx }
}

const toBase64 = (obj: unknown): string =>
  btoa(encodeURIComponent(JSON.stringify(obj)))

const fromBase64 = <T = unknown>(b64: string): T =>
  JSON.parse(decodeURIComponent(atob(b64)))

export const useConfig = () => {
  const [config, setConfig] = useState<Config>(() => {
    try {
      const saved = window.localStorage.getItem(CONFIG_KEY)
      return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig
    } catch {
      return defaultConfig
    }
  })

  useEffect(() => {
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  }, [config])

  const set = useCallback<<K extends keyof Config>(key: K, value: Config[K]) => void>(
    (key, value) => setConfig(c => ({ ...c, [key]: value })),
    []
  )

  const addColorToPalette = useCallback((color: string) => {
    setConfig(c => {
      if (c.palette.includes(color)) return c
      const palette = c.palette.length >= 16
        ? [...c.palette.slice(1), color]
        : [...c.palette, color]
      return { ...c, palette }
    })
  }, [])

  const removeColorFromPalette = useCallback((color: string) => {
    setConfig(c => ({ ...c, palette: c.palette.filter(col => col !== color) }))
  }, [])

  const exportConfig = useCallback((): string => toBase64(config), [config])
  const importConfig = useCallback((str: string): boolean => {
    try {
      const imported = fromBase64<Config>(str)
      setConfig(c => ({ ...c, ...imported }))
      return true
    } catch {
      return false
    }
  }, [])

  const { widthPx: finalWidth, heightPx: finalHeight } = getResolution(
    config.paperWidth, config.ratioX, config.ratioY, config.ppp
  )
  const rawSize = Math.round(finalWidth * PHI)

  return {
    config,
    setConfig,
    set,
    addColorToPalette,
    removeColorFromPalette,
    exportConfig,
    importConfig,
    finalWidth,
    finalHeight,
    rawSize,
    PHI
  }
}
