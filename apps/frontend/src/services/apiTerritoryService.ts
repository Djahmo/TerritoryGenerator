import type { Territory, ImageGenerationConfig } from '../utils/types'

/**
 * Service pour utiliser l'API backend pour la génération d'images de territoires
 * Remplace le TerritoryImageService local
 */
export class ApiTerritoryService {
  private baseUrl: string

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
  }
  /**
   * Génère une image standard via l'API backend
   */
  async generateStandardImage(
    territory: Territory,
    options: ImageGenerationConfig = {}
  ): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/generate-image`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        territory,
        imageType: 'standard',
        options
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Erreur HTTP ${response.status}`)
    }

    return { success: true }
  }
  /**
   * Génère une image large via l'API backend
   */
  async generateLargeImage(
    territory: Territory,
    options: ImageGenerationConfig = {}
  ): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/generate-image`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        territory,
        imageType: 'large',
        options
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Erreur HTTP ${response.status}`)
    }

    await response.json()
    return { success: true }
  }
  /**
   * Génère une image large avec crop personnalisé via l'API backend
   */
  async generateLargeImageWithCustomBbox(
    territory: Territory,
    customBbox: [number, number, number, number],
    options: ImageGenerationConfig = {},
    cropData?: {
      x: number;
      y: number;
      width: number;
      height: number;
      imageWidth: number;
      imageHeight: number;
    }
  ): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/generate-image-with-crop`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        territory,
        customBbox,
        cropData,
        options
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Erreur HTTP ${response.status}`)
    }
    return { success: true }
  }

  /**
   * Obtient les images d'un territoire
   */
  async getTerritoryImages(territoryNumber?: string, imageType?: string) {
    const params = new URLSearchParams()
    if (territoryNumber) params.append('territoryNumber', territoryNumber)
    if (imageType) params.append('imageType', imageType)

    const response = await fetch(`${this.baseUrl}/images?${params}`, {
      credentials: 'include'
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Erreur HTTP ${response.status}`)
    }

    return await response.json()
  }

  /**
   * Supprime une image de territoire
   */
  async deleteTerritoryImage(territoryNumber: string, imageType: string) {
    const response = await fetch(`${this.baseUrl}/images/${territoryNumber}/${imageType}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Erreur HTTP ${response.status}`)
    }

    return await response.json()
  }  /**
   * Sauvegarde les données de territoire (GPX uniquement)
   */
  async saveTerritoryData(gpxData: string) {
    const requestBody = {
      gpxData
    }

    const response = await fetch(`${this.baseUrl}/data`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ Erreur de la réponse:', errorData)
      throw new Error(errorData.error || `Erreur HTTP ${response.status}`)
    }

    const result = await response.json()
    return result
  }

  /**
   * Récupère les données de territoire
   */
  async getTerritoryData() {
    const response = await fetch(`${this.baseUrl}/data`, {
      credentials: 'include'
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Erreur HTTP ${response.status}`)
    }

    return await response.json()
  }  /**
   * Récupère les territoires reconstruits à partir du GPX
   */
  async getReconstructedTerritories() {
    const response = await fetch(`${this.baseUrl}/territories`, {
      credentials: 'include'
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Erreur HTTP ${response.status}`)
    }

    return await response.json()
  }
  /**
   * Récupère les territoires depuis la base de données
   */
  async getTerritories(): Promise<Territory[]> {
    const response = await fetch(`${this.baseUrl}/territories`, {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Erreur HTTP ${response.status}`)
    }

    const result = await response.json()
    return result.territories || []
  }

  /**
   * Met à jour un territoire complet avec ses images et layers
   * Supprime les anciennes images/layers avant de sauvegarder les nouveaux pour éviter la duplication
   */
  async updateTerritoryComplete(territory: Territory): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/territories/${territory.num}/complete`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        territory: {
          num: territory.num,
          name: territory.name,
          polygon: territory.polygon,
          rotation: territory.rotation,
          currentBboxLarge: territory.currentBboxLarge
        },
        images: {
          image: territory.image,
          large: territory.large,
          miniature: territory.miniature
        },
        layers: {
          paintLayersImage: territory.paintLayersImage || [],
          paintLayersLarge: territory.paintLayersLarge || []
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Erreur HTTP ${response.status}`)
    }

    return { success: true }
  }
}
