import { useEffect } from "react"
import { create } from "zustand"
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval"
import type { Territory, TerritoryCache } from "%/types"

const CACHE_KEY = "territory_cache_v1"

type State = {
  cache: TerritoryCache | null
  loading: boolean
  setCache: (cache: TerritoryCache | null) => void
  updateTerritories: (territories: Territory[]) => void
  updateGpx: (gpx: string) => void
  clearCache: () => void
  initialize: () => Promise<void>
}

export const useTerritoryStore = create<State>((set, get) => ({
  cache: null,
  loading: true,

  setCache: (cache) => {
    set({ cache })
    if (cache) idbSet(CACHE_KEY, cache)
    else idbDel(CACHE_KEY)
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
    idbSet(CACHE_KEY, newCache)
  },

  updateGpx: (gpx) => {
    const prev = get().cache
    const newCache: TerritoryCache = {
      ...(prev || {}),
      gpx,
      lastUpdate: Date.now(),
      territories: prev?.territories || [],
    }
    set({ cache: newCache })
    idbSet(CACHE_KEY, newCache)
  },

  clearCache: () => {
    set({ cache: null })
    idbDel(CACHE_KEY)
  },

  initialize: async () => {
    set({ loading: true })
    const data = await idbGet<TerritoryCache>(CACHE_KEY)
    if (data) set({ cache: data })
    set({ loading: false })
  }
}))

export const useTerritoryCache = () => {
  const { cache, loading, setCache, updateTerritories, updateGpx, clearCache, initialize } = useTerritoryStore()

  useEffect(() => {
    if (loading) initialize()
  }, [loading, initialize])

  return {
    cache,
    loading,
    setCache,
    updateTerritories,
    updateGpx,
    clearCache
  }
}
