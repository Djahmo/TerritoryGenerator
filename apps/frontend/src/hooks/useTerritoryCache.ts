import { useEffect } from "react"
import { create } from "zustand"
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval"
import type { Territory, TerritoryCache, PaintLayer } from "%/types"

const CACHE_KEY = "territory_cache_v1"

type State = {
  cache: TerritoryCache | null
  loading: boolean
  setCache: (cache: TerritoryCache | null) => void
  updateTerritories: (territories: Territory[]) => void
  updateGpx: (gpx: string) => void
  updateTerritoryLayers: (num: string, layers: PaintLayer[], isLarge?: boolean) => void
  updateTerritory: (num: string, updates: Partial<Territory>) => void
  clearCache: () => void
  initialize: () => Promise<void>
}

export const useTerritoryStore = create<State>((set, get) => ({
  cache: null,
  loading: true,
  setCache: (cache) => {
    set({ cache })
    try {
      if (cache) idbSet(CACHE_KEY, cache)
      else idbDel(CACHE_KEY)
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde du cache:', error)
    }
  },
  updateTerritories: (territories) => {
    const prev = get().cache
    const newCache: TerritoryCache = {
      ...(prev || {}),
      territories,
      lastUpdate: Date.now(),
      gpx: prev?.gpx || "",
    }
    set({ cache: newCache })
    try {
      idbSet(CACHE_KEY, newCache)
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde des territoires:', error)
    }
  },  updateGpx: (gpx) => {
    const prev = get().cache
    const newCache: TerritoryCache = {
      ...(prev || {}),
      gpx,
      lastUpdate: Date.now(),
      territories: prev?.territories || [],
    }
    set({ cache: newCache })
    try {
      idbSet(CACHE_KEY, newCache)
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde du GPX:', error)
    }
  },
  updateTerritoryLayers: (num: string, layers: PaintLayer[], isLarge: boolean = false) => {
    const prev = get().cache
    if (!prev) return

    const updatedTerritories = prev.territories.map(territory => {
      if (territory.num === num) {
        return {
          ...territory,
          ...(isLarge
            ? { paintLayersLarge: layers }
            : { paintLayersImage: layers }
          )
        }
      }
      return territory
    })

    const newCache: TerritoryCache = {
      ...prev,
      territories: updatedTerritories,
      lastUpdate: Date.now()
    }
    set({ cache: newCache })
    try {
      idbSet(CACHE_KEY, newCache)
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde des layers:', error)
    }
  },
  updateTerritory: (num: string, updates: Partial<Territory>) => {
    const prev = get().cache
    if (!prev) {
      console.warn('updateTerritory: Cache non disponible')
      return
    }

    console.log('[useTerritoryCache] updateTerritory:', {
      num,
      updates,
      hasMiniature: !!updates.miniature,
      hasLayers: !!updates.paintLayersImage || !!updates.paintLayersLarge,
      layersCount: (updates.paintLayersImage?.length || 0) + (updates.paintLayersLarge?.length || 0)
    })

    const updatedTerritories = prev.territories.map(territory => {
      if (territory.num === num) {
        const updatedTerritory = { ...territory, ...updates }
        console.log('[useTerritoryCache] Territoire mis à jour:', {
          beforeUpdate: {
            hasMiniature: !!territory.miniature,
            hasPaintLayersImage: !!territory.paintLayersImage && territory.paintLayersImage.length > 0,
            hasPaintLayersLarge: !!territory.paintLayersLarge && territory.paintLayersLarge.length > 0
          },
          afterUpdate: {
            hasMiniature: !!updatedTerritory.miniature,
            hasPaintLayersImage: !!updatedTerritory.paintLayersImage && updatedTerritory.paintLayersImage.length > 0,
            hasPaintLayersLarge: !!updatedTerritory.paintLayersLarge && updatedTerritory.paintLayersLarge.length > 0
          }
        })
        return updatedTerritory
      }
      return territory
    })

    const newCache: TerritoryCache = {
      ...prev,
      territories: updatedTerritories,
      lastUpdate: Date.now()
    }

    console.log('Nouveau cache:', newCache)
    set({ cache: newCache })

    try {
      idbSet(CACHE_KEY, newCache)
      console.log('Cache sauvegardé en IndexedDB')
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du territoire:', error)
    }
  },
  clearCache: () => {
    set({ cache: null })
    try {
      idbDel(CACHE_KEY)
    } catch (error) {
      console.warn('Erreur lors de la suppression du cache:', error)
    }
  },
  initialize: async () => {
    set({ loading: true })
    try {
      const data = await idbGet<TerritoryCache>(CACHE_KEY)
      if (data) set({ cache: data })
    } catch (error) {
      console.warn('Erreur lors du chargement du cache:', error)
      // En cas d'erreur, on repart avec un cache vide
      set({ cache: null })
    }
    set({ loading: false })
  }
}))

export const useTerritoryCache = () => {
  const {
    cache,
    loading,
    setCache,
    updateTerritories,
    updateGpx,
    updateTerritoryLayers,
    updateTerritory,
    clearCache,
    initialize
  } = useTerritoryStore()

  useEffect(() => {
    if (loading) initialize()
  }, [loading, initialize])

  return {
    cache,
    loading,
    setCache,
    updateTerritories,
    updateGpx,
    updateTerritoryLayers,
    updateTerritory,
    clearCache
  }
}
