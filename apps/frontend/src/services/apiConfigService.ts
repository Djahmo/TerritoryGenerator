export interface UserConfig {
  id: string
  userId: string

  // Configuration du canvas/papier
  ppp: number
  ratioX: number
  ratioY: number
  largeRatioX: number
  largeRatioY: number
  largeFactor: number

  // Configuration de génération d'images
  contourColor: string
  contourWidth: number
  thumbnailWidth: number
  palette: string[]

  // Configuration réseau
  networkRetries: number
  networkDelay: number
  ignApiRateLimit: number

  // Configuration API IGN
  ignApiBaseUrl: string
  ignApiLayer: string
  ignApiFormat: string
  ignApiCRS: string

  createdAt: string
  updatedAt: string
}

export interface UpdateUserConfigRequest {
  // Configuration du canvas/papier
  ppp?: number
  ratioX?: number
  ratioY?: number
  largeRatioX?: number
  largeRatioY?: number
  largeFactor?: number

  // Configuration de génération d'images
  contourColor?: string
  contourWidth?: number
  thumbnailWidth?: number
  palette?: string[]

  // Configuration réseau
  networkRetries?: number
  networkDelay?: number
  ignApiRateLimit?: number

  // Configuration API IGN
  ignApiBaseUrl?: string
  ignApiLayer?: string
  ignApiFormat?: string
  ignApiCRS?: string
}

export interface UserConfigResponse {
  success: boolean
  config: UserConfig
  message?: string
}

class ApiConfigService {
  private baseUrl = '/api'
  /**
   * Récupérer la configuration de l'utilisateur
   */
  async getUserConfig(): Promise<UserConfig> {
    try {
      const response = await fetch(`${this.baseUrl}/user-config`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`)
      }

      const data: UserConfigResponse = await response.json()
      return data.config
    } catch (error) {
      console.error('Erreur lors de la récupération de la configuration:', error)
      throw error
    }
  }
  /**
   * Mettre à jour la configuration de l'utilisateur
   */
  async updateUserConfig(updates: UpdateUserConfigRequest): Promise<UserConfig> {
    try {
      const response = await fetch(`${this.baseUrl}/user-config`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`)
      }

      const data: UserConfigResponse = await response.json()
      return data.config
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la configuration:', error)
      throw error
    }
  }
  /**
   * Réinitialiser la configuration aux valeurs par défaut
   */
  async resetUserConfig(): Promise<UserConfig> {
    try {
      const response = await fetch(`${this.baseUrl}/user-config/reset`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`)
      }

      const data: UserConfigResponse = await response.json()
      return data.config
    } catch (error) {
      console.error('Erreur lors de la réinitialisation de la configuration:', error)
      throw error
    }
  }
}

export const apiConfigService = new ApiConfigService()
