import { useState, useCallback, useRef } from "react"
import type { Territory } from "%/types"
import { ApiTerritoryService } from "../services/apiTerritoryService"

export const useApiGenerate = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 })
  const defaultImageRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Service API pour les territoires
  const apiService = new ApiTerritoryService()

  // Fonction principale de génération d'images via API
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
    setProgress({ current: 0, total: territories.length })

    // Créer un nouveau AbortController pour cette génération
    abortControllerRef.current = new AbortController()

    try {
      // Initialisation avec l'image par défaut
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
              await apiService.generateStandardImage(territory)

              if (abortControllerRef.current?.signal.aborted) {
                resolve()
                return
              }
              const targetTerritory = initialTerritories.find(t => t.num === territory.num)
              if (targetTerritory) {
                targetTerritory.isDefault = false
              }

              completedCount++
              setProgress({ current: completedCount, total: territories.length })

              callback([...initialTerritories])
            } catch (error) {
              console.error(`Erreur lors de la génération pour le territoire ${territory.num}:`, error)
              completedCount++
              setProgress({ current: completedCount, total: territories.length })
            } finally {
              resolve()
            }
          }, index * 100) // Rate limiting réduit car l'API backend gère les requêtes

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
      setProgress({ current: 0, total: 0 })
    }
  }, [])
  // Fonction pour générer une image large via API
  const generateLargeImage = useCallback(async (territory: Territory): Promise<boolean> => {
    try {
      const result = await apiService.generateLargeImage(territory)
      return result.success
    } catch (error) {
      throw new Error(`Erreur lors de la génération de l'image large: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }, [])
  // Fonction pour générer une image large avec crop personnalisé via API
  const generateLargeImageWithCrop = useCallback(async (
    territory: Territory,
    customBbox: [number, number, number, number],
    cropData?: {
      x: number;
      y: number;
      width: number;
      height: number;
      imageWidth: number;
      imageHeight: number;
    }
  ): Promise<boolean> => {
    try {
      const result = await apiService.generateLargeImageWithCustomBbox(territory, customBbox, {}, cropData)
      return result.success
    } catch (error) {
      throw new Error(`Erreur lors de la génération de l'image croppée: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }, [])

  // Fonction pour générer une miniature à partir d'une image existante
  // Note: Cette fonction reste locale car elle ne nécessite pas d'appel API
  const generateThumbnailFromImage = useCallback(async (imageDataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Impossible de créer le contexte canvas'))
          return
        }

        // Calculer les dimensions de la miniature (300px de largeur)
        const targetWidth = 300
        const targetHeight = Math.round((img.height * targetWidth) / img.width)

        canvas.width = targetWidth
        canvas.height = targetHeight

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => reject(new Error('Erreur lors du chargement de l\'image'))
      img.src = imageDataUrl
    })
  }, [])
  // Fonction pour générer une image standard via API
  const generateStandardImage = useCallback(async (territory: Territory): Promise<boolean> => {
    try {
      const result = await apiService.generateStandardImage(territory)
      return result.success
    } catch (error) {
      throw new Error(`Erreur lors de la génération de l'image standard: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }, [])

  return {
    loading,
    error,
    progress,
    generateImages,
    generateLargeImage,
    generateLargeImageWithCrop,
    generateThumbnailFromImage,
    generateStandardImage
  }
}
