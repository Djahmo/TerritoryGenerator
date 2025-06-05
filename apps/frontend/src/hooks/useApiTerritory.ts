// Fichier temporaire avec les corrections de syntaxe

import { useEffect } from "react"
import { create } from "zustand"
import type { Territory, TerritoryCache, PaintLayer } from "%/types"
import { ApiTerritoryService } from "../services/apiTerritoryService"

// Service API pour les territoires
const apiService = new ApiTerritoryService();

type State = {
  cache: TerritoryCache | null;
  loading: boolean;
  setCache: (cache: TerritoryCache | null) => void;
  updateTerritories: (territories: Territory[]) => void;
  updateGpx: (gpx: string) => void;
  updateTerritoryLayers: (num: string, layers: PaintLayer[], isLarge?: boolean) => void;
  updateTerritory: (num: string, updates: Partial<Territory>) => void;
  clearCache: () => void;
  initialize: () => Promise<void>;
  saveToBackend: () => Promise<void>;
  loadFromBackend: () => Promise<void>;
};

export const useApiTerritoryStore = create<State>((set, get) => ({
  cache: null,
  loading: true,

  setCache: (cache) => {
    set({ cache });
  },

  updateTerritories: (territories) => {
    const prev = get().cache;
    const newCache: TerritoryCache = {
      ...(prev || {}),
      territories,
      lastUpdate: Date.now(),
      gpx: prev?.gpx || "",
    };
    set({ cache: newCache });

    if (territories.length > 0 && territories.some(t => t.image)) {
      get().saveToBackend().catch(console.error);
    }
  },

  updateGpx: (gpx) => {
    const prev = get().cache;
    const newCache: TerritoryCache = {
      ...(prev || {}),
      gpx,
      lastUpdate: Date.now(),
      territories: prev?.territories || [],
    };
    set({ cache: newCache });

    if (gpx && gpx.trim() !== '') {
      get().saveToBackend().catch(console.error);
    }
  },

  updateTerritoryLayers: (num: string, layers: PaintLayer[], isLarge: boolean = false) => {
    const prev = get().cache;
    if (!prev) return;

    const updatedTerritories = prev.territories.map(territory => {
      if (territory.num === num) {
        return {
          ...territory,
          ...(isLarge
            ? { paintLayersLarge: layers }
            : { paintLayersImage: layers }
          )
        };
      }
      return territory;
    });

    const newCache: TerritoryCache = {
      ...prev,
      territories: updatedTerritories,
      lastUpdate: Date.now()
    };
    set({ cache: newCache });
  },

  updateTerritory: (num: string, updates: Partial<Territory>) => {
    const prev = get().cache;
    if (!prev) {
      console.warn('updateTerritory: Cache non disponible');
      return;
    }

    // Assurer la cohérence des URLs d'images dans les mises à jour
    const processedUpdates = { ...updates };

    // Si original est mis à jour, mettre également à jour image si elle n'est pas explicitement définie
    if (processedUpdates.original && !processedUpdates.image) {
      processedUpdates.image = processedUpdates.original;
    }

    // Si originalLarge est mis à jour, mettre également à jour large si elle n'est pas explicitement définie
    if (processedUpdates.originalLarge && !processedUpdates.large) {
      processedUpdates.large = processedUpdates.originalLarge;
    }

    const updatedTerritories = prev.territories.map(territory => {
      if (territory.num === num) {
        return { ...territory, ...processedUpdates };
      }
      return territory;
    });

    const newCache: TerritoryCache = {
      ...prev,
      territories: updatedTerritories,
      lastUpdate: Date.now()
    };

    set({ cache: newCache });

    // Sauvegarder automatiquement en backend si on a des territoires complets
    if (updatedTerritories.some(t => t.image || t.large)) {
      get().saveToBackend().catch(console.error);
    }
  },

  clearCache: () => {
    set({ cache: null });
  },

  initialize: async () => {
    set({ loading: true });
    try {
      await get().loadFromBackend();
    } catch (error) {
      console.warn('Erreur lors du chargement depuis le backend:', error);
      // En cas d'erreur, on repart avec un cache vide
      set({ cache: null });
    }
    set({ loading: false });
  },

  saveToBackend: async () => {
    const cache = get().cache;
    if (!cache) {
      console.error('❌ saveToBackend: Pas de cache disponible');
      return;
    }

    try {
      // Sauvegarder le GPX
      if (cache.gpx && cache.gpx.trim() !== '') {
        await apiService.saveTerritoryData(cache.gpx);
      } else {
        console.error('❌ saveToBackend: Pas de GPX valide à sauvegarder');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde vers le backend:', error);
      throw error;
    }
  },

  loadFromBackend: async () => {
    try {
      // Récupérer les données de territoire de l'utilisateur
      const response = await apiService.getTerritoryData();

      if (response && response.success && response.data && response.data.data) {
        // Récupérer les territoires reconstruits
        const territoriesResponse = await apiService.getReconstructedTerritories();

        if (territoriesResponse.success) {
          const territories = territoriesResponse.territories.map((territory: Territory) => {
            const updatedTerritory = { ...territory };

            if (updatedTerritory.original && !updatedTerritory.image) {
              updatedTerritory.image = updatedTerritory.original;
            }

            if (updatedTerritory.originalLarge && !updatedTerritory.large) {
              updatedTerritory.large = updatedTerritory.originalLarge;
            }

            return updatedTerritory;
          });

          const cache: TerritoryCache = {
            territories: territories,
            gpx: response.data.data,
            lastUpdate: Date.now()
          };

          set({ cache });
          return;
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données depuis le backend:', error);
      // En cas d'erreur, conserver le cache existant si disponible
      const existingCache = get().cache;
      if (!existingCache) {
        set({ cache: null });
      } else {
        console.warn('Utilisation du cache existant suite à une erreur de chargement');
      }
      return;
    }
    set({ cache: null });
  }
}));

export const useApiTerritory = () => {
  const {
    cache,
    loading,
    setCache,
    updateTerritories,
    updateGpx,
    updateTerritoryLayers,
    updateTerritory,
    clearCache,
    initialize,
    saveToBackend,
    loadFromBackend
  } = useApiTerritoryStore();

  useEffect(() => {
    if (loading) initialize();
  }, [loading, initialize]);

  return {
    cache,
    loading,
    setCache,
    updateTerritories,
    updateGpx,
    updateTerritoryLayers,
    updateTerritory,
    clearCache,
    saveToBackend,
    loadFromBackend
  };
};
