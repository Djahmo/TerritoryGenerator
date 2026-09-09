import { useEffect, useCallback } from "react"
import { create } from "zustand"
import type { Territory, TerritoryCache, PaintLayer } from "%/types"
import { ApiTerritoryService } from "../services/apiTerritoryService"

import { makeGpx } from '../utils/territoryFiles'
import { useUser } from './useUser'
import { getAccountScope, isAccountScopeCurrent } from '../services/accountScope'

type State = {
  cache: TerritoryCache | null;
  loading: boolean;
  renameTerritory: (num: string, name: string) => Promise<void>;
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

let renameQueue: Promise<void> = Promise.resolve();

export const useApiTerritoryStore = create<State>((set, get) => ({
  cache: null,
  loading: true,

  renameTerritory: (num, name) => {
    const scope = getAccountScope();
    const api = new ApiTerritoryService();
    const operation = renameQueue.catch(() => {}).then(async () => {
      if (!isAccountScopeCurrent(scope)) throw new Error('Account changed');
      const current = get().cache;
      if (!current) throw new Error('Territoires non chargés');
      if (!current.territories.some(t => t.num === num)) throw new Error('Territoire introuvable');
      const territories = current.territories.map(t => t.num === num ? { ...t, name } : t);
      const gpx = makeGpx(territories);
      await api.saveTerritoryData(gpx);
      if (!isAccountScopeCurrent(scope)) return;
      const latest = get().cache;
      if (latest) set({ cache: { ...latest, territories: latest.territories.map(t => t.num === num ? { ...t, name } : t), gpx, lastUpdate: Date.now() } });
    });
    renameQueue = operation;
    return operation;
  },
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
    const apiService = new ApiTerritoryService();
    const cache = get().cache;
    if (!cache) {
      throw new Error('Territoires non chargés');
    }

    const territory = cache.territories.find(t => t.num === num);
    if (!territory) {
      throw new Error('Territoire introuvable');
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
    const apiService = new ApiTerritoryService();
    const cache = get().cache;
    if (!cache) {
      throw new Error('Territoires non chargés');
    }

    const territory = cache.territories.find(t => t.num === num);
    if (!territory) {
      throw new Error('Territoire introuvable');
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
    set({ cache: null, loading: true });
  },

  initialize: async () => {
    const scope = getAccountScope();
    set({ loading: true });
    try {
      await get().loadFromBackend();
    } catch (error) {
      console.warn('Erreur lors du chargement depuis le backend:', error);
      // En cas d'erreur, on repart avec un cache vide
      if (isAccountScopeCurrent(scope)) set({ cache: null });
    }
    if (isAccountScopeCurrent(scope)) set({ loading: false });
  },

  saveToBackend: async () => {
    const apiService = new ApiTerritoryService();
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
    const apiService = new ApiTerritoryService();
    const scope = getAccountScope();
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

          if (!isAccountScopeCurrent(scope)) return;
          set({ cache });
          return;
        }
      }
    } catch (error) {
      if (!isAccountScopeCurrent(scope)) return;
      console.error('Erreur lors du chargement des données depuis le backend:', error);
      // En cas d'erreur, conserver le cache existant si disponible
      const existingCache = get().cache;
      if (!existingCache) {
        set({ cache: null });
      } else {
        console.warn('Utilisation du cache existant suite à une erreur de chargement');
      }
      throw error;
    }
    if (isAccountScopeCurrent(scope)) set({ cache: null });
  }
}));

useUser.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) useApiTerritoryStore.getState().clearCache();
});

export const useApiTerritory = () => {
  const scope = getAccountScope();
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
    renameTerritory,
    saveToBackend,
    loadFromBackend
  } = useApiTerritoryStore();

  useEffect(() => {
    if (loading) initialize();
  }, [loading, initialize]);
  return {
    cache,
    loading,
    renameTerritory: useCallback(async (...args: Parameters<typeof renameTerritory>) => {
      if (!isAccountScopeCurrent(scope)) throw new Error('Account changed');
      return renameTerritory(...args);
    }, [scope, renameTerritory]),
    setCache: useCallback((...args: Parameters<typeof setCache>) => {
      if (isAccountScopeCurrent(scope)) setCache(...args);
    }, [scope, setCache]),
    updateTerritories: useCallback((...args: Parameters<typeof updateTerritories>) => {
      if (isAccountScopeCurrent(scope)) updateTerritories(...args);
    }, [scope, updateTerritories]),
    updateGpx: useCallback((...args: Parameters<typeof updateGpx>) => {
      if (isAccountScopeCurrent(scope)) updateGpx(...args);
    }, [scope, updateGpx]),
    updateTerritoryLayers: useCallback((...args: Parameters<typeof updateTerritoryLayers>) => {
      if (isAccountScopeCurrent(scope)) updateTerritoryLayers(...args);
    }, [scope, updateTerritoryLayers]),
    updateTerritory: useCallback((...args: Parameters<typeof updateTerritory>) => {
      if (isAccountScopeCurrent(scope)) updateTerritory(...args);
    }, [scope, updateTerritory]),
    saveTerritoryStandard: useCallback(async (...args: Parameters<typeof saveTerritoryStandard>) => {
      if (!isAccountScopeCurrent(scope)) throw new Error('Account changed');
      return saveTerritoryStandard(...args);
    }, [scope, saveTerritoryStandard]),

    saveTerritoryLarge: useCallback(async (...args: Parameters<typeof saveTerritoryLarge>) => {
      if (!isAccountScopeCurrent(scope)) throw new Error('Account changed');
      return saveTerritoryLarge(...args);
    }, [scope, saveTerritoryLarge]),

    clearCache: useCallback((...args: Parameters<typeof clearCache>) => {
      if (isAccountScopeCurrent(scope)) clearCache(...args);
    }, [scope, clearCache]),
    saveToBackend: useCallback(async (...args: Parameters<typeof saveToBackend>) => {
      if (!isAccountScopeCurrent(scope)) throw new Error('Account changed');
      return saveToBackend(...args);
    }, [scope, saveToBackend]),

    loadFromBackend: useCallback(async (...args: Parameters<typeof loadFromBackend>) => {
      if (!isAccountScopeCurrent(scope)) throw new Error('Account changed');
      return loadFromBackend(...args);
    }, [scope, loadFromBackend]),
  };
};
