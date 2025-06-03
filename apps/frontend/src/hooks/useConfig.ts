import { useState, useEffect, useCallback } from "react"

const PHI = (1 + Math.sqrt(5)) / 2
const CONFIG_KEY = "paint-config-v1"
const PAPER_WIDTH_CM = 29.7 // A4 width in cm (constant)

// Store global pour partager l'état entre tous les composants
class ConfigStore {
  private config: Config
  private listeners: Set<(config: Config) => void> = new Set()

  constructor(initialConfig: Config) {
    this.config = initialConfig
  }

  getConfig(): Config {
    return this.config
  }

  setConfig(newConfig: Config | ((prev: Config) => Config)) {
    const nextConfig = typeof newConfig === 'function' ? newConfig(this.config) : newConfig
    this.config = nextConfig

    // Sauvegarder dans localStorage
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(nextConfig))

    // Dispatcher l'événement personnalisé
    window.dispatchEvent(new CustomEvent('configChanged', { detail: nextConfig }))

    // Notifier tous les listeners
    this.listeners.forEach(listener => listener(nextConfig))
  }

  subscribe(listener: (config: Config) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

// Instance globale du store
let configStore: ConfigStore | null = null

export type Config = {
  // Configuration du canvas/papier
  ppp: number
  ratioX: number
  ratioY: number
  // Nouveau: ratio pour les plans larges
  largeRatioX: number
  largeRatioY: number
  // Nouveau: facteur pour les plans larges
  largeFactor: number
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
  ratioX: 1.618,
  ratioY: 1,
  // Configuration pour les plans larges
  largeRatioX: 1, // Défaut à 16:9
  largeRatioY: 1.618,
  largeFactor: 0.2,
  palette: [
    "rgba(0,0,0,1)",       // Noir
    "rgba(255,0,0,1)",     // Rouge
    "rgba(0,128,0,1)",     // Vert
    "rgba(0,0,255,1)",     // Bleu
    "rgba(255,255,0,1)",   // Jaune
    "rgba(255,165,0,1)",   // Orange
    "rgba(128,0,128,1)",   // Violet
    "rgba(255,192,203,1)", // Rose
    "rgba(165,42,42,1)",   // Marron
    "rgba(128,128,128,1)"  // Gris
  ],

  // Configuration de génération d'images
  contourColor: 'red',
  contourWidth: 8,

  // Configuration des miniatures
  thumbnailWidth: 500,

  // Configuration réseau
  networkRetries: 3,
  networkDelay: 1000,
  ignApiRateLimit: 40,

  // Configuration API IGN
  ignApiBaseUrl: 'https://data.geopf.fr/wms-r',
  ignApiLayer: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
  ignApiFormat: 'image/png',
  ignApiCRS: 'EPSG:4326'
}

const getResolution = (
  pW: number, rX: number, rY: number, p: number
): { widthPx: number; heightPx: number } => {
  let widthCm: number;
  let heightCm: number;

  if (rX >= rY) {
    // Format paysage ou carré (ex: 1.41:1)
    // pW représente la largeur
    widthCm = pW;
    heightCm = pW * (rY / rX);
  } else {
    // Format portrait (ex: 1:1.41)
    // pW représente la hauteur (dimension la plus grande)
    heightCm = pW;
    widthCm = pW * (rX / rY);
  }

  const widthPx = Math.round((widthCm / 2.54) * p);
  const heightPx = Math.round((heightCm / 2.54) * p);

  return { widthPx, heightPx };
}

const toBase64 = (obj: unknown): string =>
  btoa(encodeURIComponent(JSON.stringify(obj)))

const fromBase64 = <T = unknown>(b64: string): T =>
  JSON.parse(decodeURIComponent(atob(b64)))

export const useConfig = () => {
  // Initialiser le store global s'il n'existe pas
  if (!configStore) {
    let initialConfig: Config
    try {
      const saved = window.localStorage.getItem(CONFIG_KEY)
      initialConfig = saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig
    } catch {
      initialConfig = defaultConfig
    }
    configStore = new ConfigStore(initialConfig)
  }

  const [config, setLocalConfig] = useState<Config>(() => configStore!.getConfig())

  useEffect(() => {
    // S'abonner aux changements du store global
    const unsubscribe = configStore!.subscribe((newConfig) => {
      setLocalConfig(newConfig)
    })

    return unsubscribe
  }, [])
  const setConfig = useCallback((newConfig: Config | ((prev: Config) => Config)) => {
    configStore!.setConfig(newConfig)
  }, [])

  const set = useCallback(<K extends keyof Config>(key: K, value: Config[K]) => {
    setConfig(c => ({ ...c, [key]: value }))
  }, [setConfig])
  const addColorToPalette = useCallback((color: string) => {
    setConfig(c => {
      if (c.palette.includes(color)) return c
      const palette = c.palette.length >= 16
        ? [...c.palette.slice(1), color]
        : [...c.palette, color]
      return { ...c, palette }
    })
  }, [setConfig])

  const removeColorFromPalette = useCallback((color: string) => {
    setConfig(c => ({ ...c, palette: c.palette.filter(col => col !== color) }))
  }, [setConfig])

  const exportConfig = useCallback((): string => toBase64(config), [config])
  const importConfig = useCallback((str: string): boolean => {
    try {
      const imported = fromBase64<Config>(str)
      setConfig(c => ({ ...c, ...imported }))
      return true
    } catch {
      return false
    }
  }, [setConfig])
  const { widthPx: finalWidth, heightPx: finalHeight } = getResolution(
    PAPER_WIDTH_CM, config.ratioX, config.ratioY, config.ppp
  )

  // Dimensions pour les plans larges
  const { widthPx: largeFinalWidth, heightPx: largeFinalHeight } = getResolution(
    PAPER_WIDTH_CM, config.largeRatioX, config.largeRatioY, config.ppp
  )

  const rawSize = Math.round(Math.max(finalWidth, finalHeight) * PHI)
  const largeRawSize = Math.round(Math.max(largeFinalWidth, largeFinalHeight) * PHI)

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
    largeFinalWidth,
    largeFinalHeight,
    largeRawSize,
    PHI
  }
}
