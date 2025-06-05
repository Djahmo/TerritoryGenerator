import { useState, useEffect, useCallback, useRef } from 'react'
import { apiConfigService, UserConfig, UpdateUserConfigRequest } from '@/services/apiConfigService'
import { useUser } from './useUser'

const PAPER_WIDTH_CM = 29.7 // A4 width in cm (constant)
const PHI = 1.618033988749

const getResolution = (
  pW: number, rX: number, rY: number, p: number
): { widthPx: number; heightPx: number } => {
  let widthCm: number
  let heightCm: number

  if (rX >= rY) {
    // Format paysage ou carré (ex: 1.41:1)
    // pW représente la largeur
    widthCm = pW
    heightCm = pW * (rY / rX)
  } else {
    // Format portrait (ex: 1:1.41)
    // pW représente la hauteur (dimension la plus grande)
    heightCm = pW
    widthCm = pW * (rX / rY)
  }

  const widthPx = Math.round((widthCm / 2.54) * p)
  const heightPx = Math.round((heightCm / 2.54) * p)

  return { widthPx, heightPx }
}

export const useApiConfig = () => {
  const { user } = useUser()
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Buffer system for batching updates
  const pendingUpdatesRef = useRef<UpdateUserConfigRequest>({})
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isFlushingRef = useRef(false)

  // Charger la configuration au démarrage
  useEffect(() => {
    if (user && !config) {
      loadConfig()
    }
  }, [user])

  // Nettoyer les timeouts au démontage
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const loadConfig = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)
    try {
      const userConfig = await apiConfigService.getUserConfig()
      setConfig(userConfig)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement de la configuration'
      setError(errorMessage)
      console.error('Erreur chargement config:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Fonction pour flusher les updates en attente vers l'API
  const flushPendingUpdates = useCallback(async () => {
    if (!user || isFlushingRef.current || Object.keys(pendingUpdatesRef.current).length === 0) {
      return
    }

    isFlushingRef.current = true
    const updates = { ...pendingUpdatesRef.current }
    pendingUpdatesRef.current = {} // Reset du buffer

    try {
      await apiConfigService.updateUserConfig(updates)
      // Pas besoin de setConfig ici car les updates optimistes sont déjà appliqués
    } catch (err) {
      // En cas d'erreur, on recharge la config depuis le serveur pour récupérer l'état cohérent
      console.error('Erreur lors de la sauvegarde, rechargement de la config:', err)
      await loadConfig()
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde de la configuration'
      setError(errorMessage)
    } finally {
      isFlushingRef.current = false
    }
  }, [user, loadConfig])

  // Fonction pour programmer un flush avec debounce
  const scheduleFlush = useCallback((debounceMs = 500) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      flushPendingUpdates()
    }, debounceMs)
  }, [flushPendingUpdates])

  // Mettre à jour une propriété spécifique avec optimistic update et buffer
  const setConfigProperty = useCallback(<K extends keyof UpdateUserConfigRequest>(
    key: K,
    value: UpdateUserConfigRequest[K],
    debounceMs = 500
  ) => {
    if (!config) return

    // 1. Mise à jour optimiste immédiate de l'UI
    setConfig(prev => prev ? { ...prev, [key]: value } : null)

    // 2. Ajouter au buffer des updates en attente
    pendingUpdatesRef.current = {
      ...pendingUpdatesRef.current,
      [key]: value
    }

    // 3. Programmer le flush avec debounce
    scheduleFlush(debounceMs)
  }, [config, scheduleFlush])

  // Mettre à jour plusieurs propriétés à la fois
  const updateConfig = useCallback(async (updates: UpdateUserConfigRequest, immediate = false) => {
    if (!user || !config) return

    // Mise à jour optimiste immédiate
    setConfig(prev => prev ? { ...prev, ...updates } : null)

    if (immediate) {
      // Flush immédiat
      try {
        const updatedConfig = await apiConfigService.updateUserConfig(updates)
        setConfig(updatedConfig)
        return updatedConfig
      } catch (err) {
        // En cas d'erreur, recharger depuis le serveur
        await loadConfig()
        const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la configuration'
        setError(errorMessage)
        throw err
      }
    } else {
      // Ajouter au buffer
      pendingUpdatesRef.current = {
        ...pendingUpdatesRef.current,
        ...updates
      }
      scheduleFlush()
    }
  }, [user, config, loadConfig, scheduleFlush])

  const resetConfig = useCallback(async () => {
    if (!user) return

    // Annuler les updates en attente
    pendingUpdatesRef.current = {}
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    setLoading(true)
    setError(null)
    try {
      const resetConfig = await apiConfigService.resetUserConfig()
      setConfig(resetConfig)
      return resetConfig
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la réinitialisation de la configuration'
      setError(errorMessage)
      console.error('Erreur réinitialisation config:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user])

  // Ajouter une couleur à la palette avec optimistic update
  const addColorToPalette = useCallback((color: string) => {
    if (!config) return

    if (config.palette.includes(color)) return

    const newPalette = config.palette.length >= 16
      ? [...config.palette.slice(1), color]
      : [...config.palette, color]

    setConfigProperty('palette', newPalette, 300) // Debounce plus court pour les couleurs
  }, [config, setConfigProperty])

  // Supprimer une couleur de la palette avec optimistic update
  const removeColorFromPalette = useCallback((color: string) => {
    if (!config) return

    const newPalette = config.palette.filter((col: string) => col !== color)
    setConfigProperty('palette', newPalette, 300) // Debounce plus court pour les couleurs
  }, [config, setConfigProperty])

  // Force flush (pour les cas où on veut sauvegarder immédiatement)
  const saveNow = useCallback(async () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    await flushPendingUpdates()
  }, [flushPendingUpdates])

  // Calculer les dimensions finales basées sur la configuration
  const dimensions = config ? (() => {
    const { widthPx: finalWidth, heightPx: finalHeight } = getResolution(
      PAPER_WIDTH_CM, config.ratioX, config.ratioY, config.ppp
    )

    const { widthPx: largeFinalWidth, heightPx: largeFinalHeight } = getResolution(
      PAPER_WIDTH_CM, config.largeRatioX, config.largeRatioY, config.ppp
    )

    const rawSize = Math.round(Math.max(finalWidth, finalHeight) * PHI)
    const largeRawSize = Math.round(Math.max(largeFinalWidth, largeFinalHeight) * PHI)

    return {
      finalWidth,
      finalHeight,
      rawSize,
      largeFinalWidth,
      largeFinalHeight,
      largeRawSize
    }
  })() : null

  // Fonctions de compatibilité avec l'ancien useConfig pour faciliter la migration
  const exportConfig = useCallback((): string => {
    if (!config) return ''
    return btoa(encodeURIComponent(JSON.stringify(config)))
  }, [config])

  const importConfig = useCallback(async (str: string): Promise<boolean> => {
    try {
      const imported = JSON.parse(decodeURIComponent(atob(str)))
      await updateConfig(imported, true) // Import immédiat
      return true
    } catch {
      return false
    }
  }, [updateConfig])

  return {
    config,
    loading,
    error,

    // Actions principales
    loadConfig,
    updateConfig,
    resetConfig,
    setConfigProperty,
    saveNow,

    // Actions pour la palette
    addColorToPalette,
    removeColorFromPalette,

    // Import/Export
    exportConfig,
    importConfig,

    // Propriétés calculées
    dimensions,
    finalWidth: dimensions?.finalWidth || 0,
    finalHeight: dimensions?.finalHeight || 0,
    rawSize: dimensions?.rawSize || 0,
    largeFinalWidth: dimensions?.largeFinalWidth || 0,
    largeFinalHeight: dimensions?.largeFinalHeight || 0,
    largeRawSize: dimensions?.largeRawSize || 0,
    PHI,

    // État du buffer (pour debug)
    hasPendingUpdates: Object.keys(pendingUpdatesRef.current).length > 0
  }
}
