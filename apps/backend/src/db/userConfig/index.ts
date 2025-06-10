// filepath: c:\Users\Clayton\Documents\Dev\www\TerritoryGenerator\apps\backend\src\db\userConfig/index.ts
import { eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../index.js'
import { userConfigs, InsertUserConfig, UserConfig } from '../../schema/config.js'

/**
 * Créer ou récupérer la configuration d'un utilisateur
 */
export async function getUserConfig(userId: string): Promise<UserConfig> {
  // Essayer de récupérer la configuration existante
  const existingConfig = await db.select()
    .from(userConfigs)
    .where(eq(userConfigs.userId, userId))
    .limit(1)

  if (existingConfig.length > 0) {
    return existingConfig[0]
  }

  // Si aucune configuration n'existe, créer une configuration par défaut
  const defaultConfig: InsertUserConfig = {
    id: nanoid(),
    userId,
    ppp: 250,
    ratioX: '1.618000',
    ratioY: '1.000000',
    largeRatioX: '1.000000',
    largeRatioY: '1.618000',
    largeFactor: '0.200',
    contourColor: 'red',
    contourWidth: 8,
    thumbnailWidth: 500,
    palette: JSON.stringify([
      "rgba(0,0,0,1)",
      "rgba(255,0,0,1)",
      "rgba(0,128,0,1)",
      "rgba(0,0,255,1)",
      "rgba(255,255,0,1)",
      "rgba(0,255,255,1)",
      "rgba(255,0,255,1)",
      "rgba(255,255,255,1)",
      "rgba(255,165,0,1)",
      "rgba(128,0,128,1)"
    ]),
    networkRetries: 3,
    networkDelay: 1000,
    ignApiRateLimit: 40,
    ignApiBaseUrl: 'https://data.geopf.fr/wms-r',
    ignApiLayer: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
    ignApiFormat: 'image/png',
    ignApiCRS: 'EPSG:4326'
  }

  await db.insert(userConfigs).values(defaultConfig)

  // Retourner la configuration créée
  const newConfig = await db.select()
    .from(userConfigs)
    .where(eq(userConfigs.userId, userId))
    .limit(1)

  return newConfig[0]
}

/**
 * Mettre à jour la configuration d'un utilisateur
 */
export async function updateUserConfig(
  userId: string,
  updates: Partial<Omit<UserConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<UserConfig> {
  // S'assurer que la configuration existe
  await getUserConfig(userId)

  // Mettre à jour la configuration
  await db.update(userConfigs)
    .set(updates)
    .where(eq(userConfigs.userId, userId))

  // Retourner la configuration mise à jour
  const updatedConfig = await db.select()
    .from(userConfigs)
    .where(eq(userConfigs.userId, userId))
    .limit(1)

  return updatedConfig[0]
}

/**
 * Réinitialiser la configuration d'un utilisateur aux valeurs par défaut
 */
export async function resetUserConfig(userId: string): Promise<UserConfig> {
  const defaultUpdates = {
    ppp: 250,
    ratioX: '1.618000',
    ratioY: '1.000000',
    largeRatioX: '1.000000',
    largeRatioY: '1.618000',
    largeFactor: '0.200',
    contourColor: 'red',
    contourWidth: 8,
    thumbnailWidth: 500,
    palette: JSON.stringify([
      "rgba(0,0,0,1)",
      "rgba(255,0,0,1)",
      "rgba(0,128,0,1)",
      "rgba(0,0,255,1)",
      "rgba(255,255,0,1)",
      "rgba(0,255,255,1)",
      "rgba(255,0,255,1)",
      "rgba(255,255,255,1)",
      "rgba(255,165,0,1)",
      "rgba(128,0,128,1)",
      "rgba(255,192,203,1)",
      "rgba(165,42,42,1)",
      "rgba(128,128,128,1)"
    ]),
    networkRetries: 3,
    networkDelay: 1000,
    ignApiRateLimit: 40,
    ignApiBaseUrl: 'https://data.geopf.fr/wms-r',
    ignApiLayer: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
    ignApiFormat: 'image/png',
    ignApiCRS: 'EPSG:4326'
  }

  return updateUserConfig(userId, defaultUpdates)
}
