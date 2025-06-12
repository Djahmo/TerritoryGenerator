import { useState, useCallback, useRef } from "react"
import type { Territory } from "%/types"
import { ApiTerritoryService } from "../services/apiTerritoryService"

export const useApiGenerate = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 })
  const abortControllerRef = useRef<AbortController | null>(null)

  // Service API pour les territoires
  const apiService = new ApiTerritoryService()  /**
   * Génère une image pour un territoire avec système de retry robuste
   * Réessaie jusqu'à 10 fois en cas d'échec, sans timeout global
   */
  const generateImageWithRetry = useCallback(async (
    territory: Territory,
    maxRetries: number = 10
  ): Promise<{ success: boolean; error?: string }> => {
    let lastError: string = '';
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Vérifier l'annulation avant chaque tentative
        if (abortControllerRef.current?.signal.aborted) {
          return { success: false, error: 'Génération annulée' };
        }

        console.log(`🔄 Tentative ${attempt}/${maxRetries} pour le territoire ${territory.num}`);
        
        // Appel de l'API sans timeout global
        await apiService.generateStandardImage(territory);
        
        console.log(`✅ Territoire ${territory.num} généré avec succès (tentative ${attempt})`);
        return { success: true };
        
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Erreur inconnue';
        console.warn(`❌ Tentative ${attempt}/${maxRetries} échouée pour le territoire ${territory.num}:`, lastError);
        
        // Si ce n'est pas la dernière tentative, attendre un peu avant de réessayer
        if (attempt < maxRetries && !abortControllerRef.current?.signal.aborted) {
          // Délai progressif : 1s, 2s, 3s, etc.
          const delay = attempt * 1000;
          console.log(`⏳ Attente de ${delay}ms avant la prochaine tentative...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`💥 Échec définitif pour le territoire ${territory.num} après ${maxRetries} tentatives`);
    return { success: false, error: lastError };
  }, []);

  // Fonction principale de génération d'images via API
  const generateImages = useCallback(async (
    territories: Territory[],
    callback: (territories: Territory[]) => void,
    existingTerritories?: Territory[]
  ) => {
    setLoading(true)
    setError(null)

    // 🎯 NOUVEAU: Vérifier en BDD quels territoires ont déjà des images générées
    let territoriesToGenerate = territories;
    
    try {
      console.log('🔍 Vérification des territoires existants en base de données...')
      
      // Récupérer tous les territoires existants avec leurs images depuis la DB
      const dbTerritories = await apiService.getTerritories()
      console.log(`📊 Territoires trouvés en DB: ${dbTerritories.length}`)
      
      if (dbTerritories.length > 0) {        // Créer un Set des numéros de territoires qui ont déjà une image standard ET une miniature
        const territoriesWithImages = new Set(
          dbTerritories
            .filter(t => t.image && t.miniature) // Territoire avec image standard ET miniature
            .map(t => t.num)
        )
        
        console.log(`✅ Territoires avec images existantes: [${Array.from(territoriesWithImages).join(', ')}]`)
        
        // Filtrer pour ne générer QUE les territoires sans images
        territoriesToGenerate = territories.filter(t => !territoriesWithImages.has(t.num))
        
        console.log(`🎯 Territoires à générer: [${territoriesToGenerate.map(t => t.num).join(', ')}]`)
      }
    } catch (error) {
      console.warn('⚠️ Erreur lors de la vérification DB, génération de tous les territoires:', error)
      // En cas d'erreur, continuer avec la logique existante
      if (existingTerritories && existingTerritories.length > 0) {
        const existingNums = new Set(existingTerritories.map(t => t.num));
        territoriesToGenerate = territories.filter(t => !existingNums.has(t.num));
      }
    }

    // Si aucun nouveau territoire, on évite la génération
    if (territoriesToGenerate.length === 0) {
      console.log('✅ Tous les territoires ont déjà des images, pas de génération nécessaire')
      setLoading(false);
      return;
    }

    console.log(`🚀 Démarrage de la génération pour ${territoriesToGenerate.length} territoires`)
    setProgress({ current: 0, total: territoriesToGenerate.length })

    // Créer un nouveau AbortController pour cette génération
    abortControllerRef.current = new AbortController()

    try {
      // Initialisation des territoires (tous, pas seulement les nouveaux)
      const initialTerritories: Territory[] = [...territories]
      callback([...initialTerritories])

      // Compteur pour suivre les images terminées (réussies ET échouées)
      let completedCount = 0
      let successCount = 0
      let failedTerritories: string[] = []

      // Générer les territoires en parallèle avec retry
      const promises = territoriesToGenerate.map(async (territory, index) => {
        // Délai initial entre territoires pour éviter la surcharge
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * index));
        }

        // Vérifier l'annulation
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        // Générer avec retry
        const result = await generateImageWithRetry(territory);
        
        // Mettre à jour les compteurs
        completedCount++
        if (result.success) {
          successCount++
        } else {
          failedTerritories.push(territory.num)
        }

        // Mettre à jour le progress
        setProgress({ current: completedCount, total: territoriesToGenerate.length })

        // Mettre à jour le callback
        callback([...initialTerritories])
      })

      await Promise.all(promises)

      // Gestion des erreurs finales
      if (failedTerritories.length > 0) {
        const errorMessage = `Génération échouée pour ${failedTerritories.length} territoire(s): ${failedTerritories.join(', ')}. ${successCount} territoire(s) généré(s) avec succès.`
        console.error(errorMessage)
        setError(errorMessage)
      } else {
        console.log(`🎉 Tous les territoires ont été générés avec succès !`)
      }

    } catch (error) {
      const errorMessage = `Erreur lors de la génération: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      console.error(errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
      setProgress({ current: 0, total: 0 })
    }
  }, [generateImageWithRetry])
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
