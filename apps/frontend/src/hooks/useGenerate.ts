import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import type { Territory } from "%/types"
import { useConfig } from "&/useConfig"
import { TerritoryImageService } from "../services/territoryImageService"
import { loadDefaultThumbnail } from "../services/thumbnailService"

export const useGenerate = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const defaultImageRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { config, finalWidth, finalHeight, rawSize, PHI } = useConfig()

  // Mémorisation du service pour éviter les recréations
  const imageService = useMemo(() =>
    new TerritoryImageService(
      config,
      { finalWidth, finalHeight, rawSize },
      PHI
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
    setPendingCount(territories.length)

    // Créer un nouveau AbortController pour cette génération
    abortControllerRef.current = new AbortController()

    try {
      // Initialisation avec l'image par défaut
      const initialTerritories: Territory[] = territories.map(territory => ({
        ...territory,
        miniature: defaultImageRef.current!,
        image: '',
        imagelarge: '',
        isDefault: true
      }))

      callback([...initialTerritories])

      // Compteur pour suivre les images terminées
      let completedCount = 0

      // Lancement de tous les téléchargements en parallèle avec délais pour respecter l'API IGN
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

              // Vérifier à nouveau après l'appel async
              if (abortControllerRef.current?.signal.aborted) {
                resolve()
                return
              }

              // Mise à jour du territoire correspondant
              const targetTerritory = initialTerritories.find(t => t.num === territory.num)
              if (targetTerritory) {
                targetTerritory.image = result.image
                targetTerritory.miniature = result.miniature
                targetTerritory.isDefault = false
              }

              completedCount++
              setPendingCount(territories.length - completedCount)

              // Callback pour mettre à jour l'UI après chaque image générée
              callback([...initialTerritories])
            } catch (error) {
              console.error(`Erreur lors de la génération pour le territoire ${territory.num}:`, error)
              // En cas d'erreur, on garde l'image par défaut
              completedCount++
              setPendingCount(territories.length - completedCount)
            } finally {
              resolve()
            }
          }, index * 25) // 25ms d'écart entre chaque démarrage (respecte la limite IGN de 40 req/sec)

          // Enregistrer le timeout pour pouvoir l'annuler si nécessaire
          abortControllerRef.current?.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId)
            resolve()
          })
        })
      )

      await Promise.all(promises)
      setPendingCount(0)
    } catch (error) {
      setError(`Erreur lors de la génération: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    } finally {
      setLoading(false)
    }
  }, [imageService])
  // Fonction pour générer une image large
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
  }, [imageService])// Fonction pour annuler la génération en cours
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setLoading(false)
    setError(null)
    setPendingCount(0)
  }, [])

  // Fonction pour obtenir le nombre de tâches en attente
  const getPendingCount = useCallback(() => {
    return pendingCount
  }, [pendingCount])
  return {
    loading,
    error,
    generateImages,
    generateLargeImage,
    generateThumbnailFromImage,
    cancelGeneration,
    getPendingCount
  }
}
