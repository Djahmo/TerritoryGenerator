import type { PaintLayer } from '../utils/types'
import { API_URL } from '../utils/constants'

/**
 * Service pour interagir avec l'API des layers
 */
export class LayerApiService {
  private static apiBaseUrl = API_URL

  /**
   * Récupère tous les layers d'un territoire
   */
  static async getLayers(territoryNumber: string, imageType?: 'standard' | 'large'): Promise<PaintLayer[]> {
    try {
      const url = new URL(`${this.apiBaseUrl}/territories/${territoryNumber}/layers`);
      if (imageType) {
        url.searchParams.append('imageType', imageType);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des layers: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Erreur inconnue');
      }

      // Convertir les données JSON en objets PaintLayer
      return result.data.map((layer: any) => ({
        id: layer.id,
        type: layer.layerType,
        visible: layer.visible,
        locked: layer.locked,
        name: layer.name,
        style: JSON.parse(layer.style),
        timestamp: layer.timestamp,
        data: JSON.parse(layer.layerData)
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des layers:', error);
      throw error;
    }
  }

  /**
   * Crée un nouveau layer
   */
  static async createLayer(territoryNumber: string, layer: PaintLayer, imageType: 'standard' | 'large'): Promise<PaintLayer> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/territories/${territoryNumber}/layers`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          territoryNumber,
          imageType,
          visible: layer.visible,
          locked: layer.locked,
          name: layer.name,
          style: JSON.stringify(layer.style),
          layerType: layer.type,
          layerData: JSON.stringify(layer.data)
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de la création du layer: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Erreur inconnue');
      }

      // Convertir les données de réponse en objet PaintLayer
      return {
        id: result.data.id,
        type: result.data.layerType,
        visible: result.data.visible,
        locked: result.data.locked,
        name: result.data.name,
        style: JSON.parse(result.data.style),
        timestamp: result.data.timestamp,
        data: JSON.parse(result.data.layerData)
      };
    } catch (error) {
      console.error('Erreur lors de la création du layer:', error);
      throw error;
    }
  }

  /**
   * Met à jour un layer existant
   */
  static async updateLayer(layerId: string, updates: Partial<PaintLayer>): Promise<void> {
    try {
      const updateData: any = {};
      
      if (updates.visible !== undefined) updateData.visible = updates.visible;
      if (updates.locked !== undefined) updateData.locked = updates.locked;
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.style !== undefined) updateData.style = JSON.stringify(updates.style);
      if (updates.data !== undefined) updateData.layerData = JSON.stringify(updates.data);

      const response = await fetch(`${this.apiBaseUrl}/territories/layers/${layerId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de la mise à jour du layer: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du layer:', error);
      throw error;
    }
  }

  /**
   * Supprime un layer
   */
  static async deleteLayer(layerId: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/territories/layers/${layerId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de la suppression du layer: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du layer:', error);
      throw error;
    }
  }

  /**
   * Supprime tous les layers d'un territoire
   */
  static async deleteAllLayers(territoryNumber: string, imageType?: 'standard' | 'large'): Promise<void> {
    try {
      const url = new URL(`${this.apiBaseUrl}/territories/${territoryNumber}/layers`);
      if (imageType) {
        url.searchParams.append('imageType', imageType);
      }

      const response = await fetch(url.toString(), {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de la suppression des layers: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression des layers:', error);
      throw error;
    }
  }
}
