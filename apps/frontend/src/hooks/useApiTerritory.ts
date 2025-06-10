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
  updateTerritoryLayers: (num: string, layers: PaintLayer[], isLarge?: boolean) => void;  updateTerritory: (num: string, updates: Partial<Territory>) => void;
  saveTerritoryStandard: (num: string) => Promise<void>;
  saveTerritoryLarge: (num: string) => Promise<void>;
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
  updateTerritoryLayers: async (num: string, layers: PaintLayer[], isLarge: boolean = false) => {
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

    // Sauvegarder automatiquement via l'API complète
    const updatedTerritory = updatedTerritories.find(t => t.num === num);
    if (updatedTerritory) {
      try {
        console.log(`🎨 Sauvegarde des couches de peinture pour le territoire ${num} (${isLarge ? 'large' : 'standard'})`);
        await apiService.updateTerritoryComplete(updatedTerritory);
        console.log(`✅ Couches de peinture du territoire ${num} sauvegardées avec succès`);
      } catch (error) {
        console.error(`❌ Erreur lors de la sauvegarde des couches du territoire ${num}:`, error);
      }
    }
  },
  updateTerritory: async (num: string, updates: Partial<Territory>) => {
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
    };    set({ cache: newCache });

    // PLUS DE SAUVEGARDE AUTOMATIQUE ! 
    // La sauvegarde doit être explicite via le bouton "Sauvegarder"
    console.log(`📝 Territoire ${num} mis à jour localement (pas de sauvegarde auto)`);
  },

  saveTerritoryStandard: async (num: string) => {
    const cache = get().cache;
    if (!cache) {
      console.error('❌ saveTerritoryStandard: Pas de cache disponible');
      return;
    }

    const territory = cache.territories.find(t => t.num === num);
    if (!territory) {
      console.error(`❌ saveTerritoryStandard: Territoire ${num} non trouvé`);
      return;
    }

    try {
      console.log(`💾 Sauvegarde STANDARD explicite du territoire ${num}`);
        // Créer l'objet avec uniquement les données standard
      const territoryToSave = {
        ...territory,
        // Assurer que les données sont cohérentes
        image: territory.image || territory.original,
        original: territory.original || territory.image,
        // Ne sauvegarder que les layers standard
        paintLayersImage: territory.paintLayersImage || [],
        // Exclure les données large pour éviter la corruption
        large: undefined,
        originalLarge: undefined,
        paintLayersLarge: undefined      };

      await apiService.saveTerritoryStandard(territoryToSave);
      console.log(`✅ Territoire ${num} (standard) sauvegardé avec succès`);
    } catch (error) {
      console.error(`❌ Erreur lors de la sauvegarde standard du territoire ${num}:`, error);
      throw error;
    }
  },

  saveTerritoryLarge: async (num: string) => {
    const cache = get().cache;
    if (!cache) {
      console.error('❌ saveTerritoryLarge: Pas de cache disponible');
      return;
    }

    const territory = cache.territories.find(t => t.num === num);
    if (!territory) {
      console.error(`❌ saveTerritoryLarge: Territoire ${num} non trouvé`);
      return;
    }

    try {
      console.log(`💾 Sauvegarde LARGE explicite du territoire ${num}`);
        // Créer l'objet avec uniquement les données large
      const territoryToSave = {
        ...territory,
        // Assurer que les données sont cohérentes
        large: territory.large || territory.originalLarge,
        originalLarge: territory.originalLarge || territory.large,
        // Ne sauvegarder que les layers large
        paintLayersLarge: territory.paintLayersLarge || [],
        // Exclure les données standard pour éviter la corruption
        image: undefined,
        original: undefined,
        miniature: undefined,
        paintLayersImage: undefined      };

      await apiService.saveTerritoryLarge(territoryToSave);
      console.log(`✅ Territoire ${num} (large) sauvegardé avec succès`);
    } catch (error) {
      console.error(`❌ Erreur lors de la sauvegarde large du territoire ${num}:`, error);
      throw error;
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
    saveTerritoryStandard,
    saveTerritoryLarge,
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
    saveTerritoryStandard,
    saveTerritoryLarge,
    clearCache,
    saveToBackend,
    loadFromBackend
  };
};
