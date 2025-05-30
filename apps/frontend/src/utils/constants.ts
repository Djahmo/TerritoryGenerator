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
