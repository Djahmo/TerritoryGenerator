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
   * Effectue une requête avec AbortController pour éviter les timeouts bloquants
   */
  private async fetchWithoutTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController()
    
    const fetchOptions: RequestInit = {
      ...options,
      signal: controller.signal,
      credentials: 'include'
    }

    try {
      const response = await fetch(url, fetchOptions)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`)
      }
      
      return response
    } catch (error) {
      // Ne pas masquer les erreurs de réseau ou les erreurs d'API
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Erreur de requête inconnue')
    }
  }

  /**
   * Génère une image standard via l'API backend
   */
  async generateStandardImage(
    territory: Territory,
    options: ImageGenerationConfig = {}
  ): Promise<{ success: boolean }> {
    const response = await this.fetchWithoutTimeout(`${this.baseUrl}/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        territory,
        imageType: 'standard',
        options
      })
    })

    const result = await response.json()
    
    // Vérifier explicitement le succès - ne jamais assumer un succès
    if (result.success !== true) {
      throw new Error(result.error || 'Génération échouée côté serveur')
    }

    return { success: true }
  }  /**
   * Génère une image large via l'API backend
   */
  async generateLargeImage(
    territory: Territory,
    options: ImageGenerationConfig = {}
  ): Promise<{ success: boolean }> {
    const response = await this.fetchWithoutTimeout(`${this.baseUrl}/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        territory,
        imageType: 'large',
        options
      })
    })

    const result = await response.json()
    
    // Vérifier explicitement le succès
    if (result.success !== true) {
      throw new Error(result.error || 'Génération large échouée côté serveur')
    }

    return { success: true }
  }  /**
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
    const response = await this.fetchWithoutTimeout(`${this.baseUrl}/generate-image-with-crop`, {
      method: 'POST',
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

    const result = await response.json()
    
    // Vérifier explicitement le succès
    if (result.success !== true) {
      throw new Error(result.error || 'Génération avec crop échouée côté serveur')
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

    const response = await this.fetchWithoutTimeout(`${this.baseUrl}/images?${params}`)
    return await response.json()
  }

  /**
   * Supprime une image de territoire
   */
  async deleteTerritoryImage(territoryNumber: string, imageType: string) {
    const response = await this.fetchWithoutTimeout(`${this.baseUrl}/images/${territoryNumber}/${imageType}`, {
      method: 'DELETE'
    })
    return await response.json()
  }

  /**
   * Sauvegarde les données de territoire (GPX uniquement)
   */
  async saveTerritoryData(gpxData: string) {
    const requestBody = {
      gpxData
    }

    const response = await this.fetchWithoutTimeout(`${this.baseUrl}/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    const result = await response.json()
    return result
  }

  /**
   * Récupère les données de territoire
   */
  async getTerritoryData() {
    const response = await this.fetchWithoutTimeout(`${this.baseUrl}/data`)
    return await response.json()
  }

  /**
   * Récupère les territoires reconstruits à partir du GPX
   */
  async getReconstructedTerritories() {
    const response = await this.fetchWithoutTimeout(`${this.baseUrl}/territories`)
    return await response.json()
  }

  /**
   * Récupère les territoires depuis la base de données
   */
  async getTerritories(): Promise<Territory[]> {
    const response = await this.fetchWithoutTimeout(`${this.baseUrl}/territories`, {
      method: 'GET'
    })

    const result = await response.json()
    return result.territories || []
  }
  /**
   * Met à jour un territoire complet avec ses images et layers
   * Supprime les anciennes images/layers avant de sauvegarder les nouveaux pour éviter la duplication
   */
  async updateTerritoryComplete(territory: Territory): Promise<{ success: boolean }> {
    const response = await this.fetchWithoutTimeout(`${this.baseUrl}/territories/${territory.num}/complete`, {
      method: 'PUT',
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

    const result = await response.json()
    
    // Vérifier explicitement le succès
    if (result.success !== true) {
      throw new Error(result.error || 'Mise à jour complète échouée côté serveur')
    }

    return { success: true }
  }

  /**
   * Sauvegarde UNIQUEMENT les données standard d'un territoire
   */
  async saveTerritoryStandard(territory: Territory): Promise<{ success: boolean }> {
    const response = await this.fetchWithoutTimeout(`${this.baseUrl}/territories/${territory.num}/standard`, {
      method: 'PUT',
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
          miniature: territory.miniature
        },
        layers: {
          paintLayersImage: territory.paintLayersImage || []
        }
      })
    })

    const result = await response.json()
    
    // Vérifier explicitement le succès
    if (result.success !== true) {
      throw new Error(result.error || 'Sauvegarde standard échouée côté serveur')
    }

    return { success: true }
  }

  /**
   * Sauvegarde UNIQUEMENT les données large d'un territoire
   */
  async saveTerritoryLarge(territory: Territory): Promise<{ success: boolean }> {
    const response = await this.fetchWithoutTimeout(`${this.baseUrl}/territories/${territory.num}/large`, {
      method: 'PUT',
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
          large: territory.large
        },
        layers: {
          paintLayersLarge: territory.paintLayersLarge || []
        }
      })
    })

    const result = await response.json()
    
    // Vérifier explicitement le succès
    if (result.success !== true) {
      throw new Error(result.error || 'Sauvegarde large échouée côté serveur')
    }

    return { success: true }
  }
}
