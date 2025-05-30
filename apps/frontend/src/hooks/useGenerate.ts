import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import type { Territory } from "%/types"
import { useConfig } from "&/useConfig"
import { TerritoryImageService } from "../services/territoryImageService"
import { loadDefaultThumbnail } from "../services/thumbnailService"

export const useGenerate = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const defaultImageRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { config, finalWidth, finalHeight, rawSize, PHI } = useConfig()  // Mémorisation du service pour éviter les recréations
  const imageService = useMemo(() =>
    new TerritoryImageService(
      config,
      { finalWidth, finalHeight, rawSize },
      PHI,
      {
        contourColor: config.contourColor,
        contourWidth: config.contourWidth,
        thumbnailWidth: config.thumbnailWidth,
        ignApiBaseUrl: config.ignApiBaseUrl,
        ignApiLayer: config.ignApiLayer,
        ignApiFormat: config.ignApiFormat,
        ignApiCRS: config.ignApiCRS,
        networkRetries: config.networkRetries,
        networkDelay: config.networkDelay,
        ignApiRateLimit: config.ignApiRateLimit
      }
    ),
    [config, finalWidth, finalHeight, rawSize, PHI]
  )

  // Chargement de l'image par défaut
  useEffect(() => {
    let isMounted = true

    const loadDefault = async () => {
      try {
        if (!defaultImageRef.current) {
          const defaultImage = await loadDefaultThumbnail("/images/default.png", finalWidth, finalHeight)
          if (isMounted) {
            defaultImageRef.current = defaultImage
          }
        }
      } catch (error) {
        if (isMounted) {
          setError(`Erreur lors du chargement de l'image par défaut: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
        }
      }
    }

    loadDefault()

    return () => {
      isMounted = false
    }
  }, [finalWidth, finalHeight])  // Fonction principale de génération d'images
  const generateImages = useCallback(async (
    territories: Territory[],
    callback: (territories: Territory[]) => void
  ) => {
    if (!defaultImageRef.current) {
      setError("Image par défaut non chargée")
      return
    }

    setLoading(true)
    setError(null)

    // Créer un nouveau AbortController pour cette génération
    abortControllerRef.current = new AbortController()

    try {      // Initialisation avec l'image par défaut
      const initialTerritories: Territory[] = territories.map(territory => ({
        ...territory,
        miniature: defaultImageRef.current!,
        image: '',
        original: '',
        originalLarge: '',
        isDefault: true
      }))

      callback([...initialTerritories])

      // Compteur pour suivre les images terminées
      let completedCount = 0

      const promises = territories.map((territory, index) =>
        new Promise<void>((resolve) => {
          const timeoutId = setTimeout(async () => {
            try {
              // Vérifier si la génération a été annulée
              if (abortControllerRef.current?.signal.aborted) {
                resolve()
                return
              }

              const result = await imageService.generateStandardImage(territory)

              if (abortControllerRef.current?.signal.aborted) {
                resolve()
                return
              }
              const targetTerritory = initialTerritories.find(t => t.num === territory.num)
              if (targetTerritory) {
                targetTerritory.original = result.image
                targetTerritory.image = result.image
                targetTerritory.miniature = result.miniature
                targetTerritory.isDefault = false
              }

              completedCount++

              callback([...initialTerritories])
            } catch (error) {
              console.error(`Erreur lors de la génération pour le territoire ${territory.num}:`, error)
              completedCount++
            } finally {
              resolve()
            }
          }, index * config.ignApiRateLimit)

          // Enregistrer le timeout pour pouvoir l'annuler si nécessaire
          abortControllerRef.current?.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId)
            resolve()
          })
        })
      )

      await Promise.all(promises)
    } catch (error) {
      setError(`Erreur lors de la génération: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    } finally {
      setLoading(false)
    }
  }, [imageService])  // Fonction pour générer une image large et la sauvegarder

  // Fonction pour générer une image large (sans sauvegarde)
  const generateLargeImage = useCallback(async (territory: Territory): Promise<string> => {
    try {
      return await imageService.generateLargeImage(territory)
    } catch (error) {
      throw new Error(`Erreur lors de la génération de l'image large: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }, [imageService])

  // Fonction pour générer une miniature à partir d'une image existante
  const generateThumbnailFromImage = useCallback(async (imageDataUrl: string): Promise<string> => {
    try {
      return await imageService.generateThumbnailFromImage(imageDataUrl)
    } catch (error) {
      throw new Error(`Erreur lors de la génération de la miniature: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }, [imageService])


  return {
    loading,
    error,
    generateImages,
    generateLargeImage,
    generateThumbnailFromImage
  }
}
