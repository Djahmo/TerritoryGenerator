/**
 * Configuration pour la génération d'images
 */
export interface ImageGenerationConfig {
  contourColor?: string
  contourWidth?: number
}

/**
 * Résultat de génération d'image
 */
export interface GeneratedImage {
  miniature: string
  image: string
}

/**
 * Configuration par défaut
 */
export const DEFAULT_CONFIG: Required<ImageGenerationConfig> = {
  contourColor: 'red',
  contourWidth: 8
}

/**
 * Constantes de l'API IGN
 */
export const IGN_API = {
  BASE_URL: 'https://data.geopf.fr/wms-r',
  LAYER: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
  FORMAT: 'image/png',
  CRS: 'EPSG:4326'
} as const

/**
 * Délais et retry pour les requêtes réseau
 * Note: L'API IGN limite à 40 requêtes/seconde maximum (soit 1 req/25ms minimum)
 */
export const NETWORK_CONFIG = {
  DEFAULT_RETRIES: 3,
  DEFAULT_DELAY: 1000,
  IGN_API_RATE_LIMIT: 25 // 25ms minimum entre chaque requête vers l'API IGN
} as const

/**
 * Tailles pour les miniatures
 */
export const THUMBNAIL_CONFIG = {
  CROP_WIDTH: 500,
  FINAL_WIDTH: 300
} as const
