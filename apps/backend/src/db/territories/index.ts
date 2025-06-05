import { eq, and, desc } from 'drizzle-orm'
import { db } from '../index.js'
import { territoryImages, territoryData } from '../../schema/territories.js'
import { nanoid } from 'nanoid'
import { reconstructTerritoriesFromGpx } from '../../utils/gpxParser.js'
import env from '../../env.js'

// Constante pour l'URL frontend ou URL par défaut si env non défini
const FRONTEND_URL = env.FRONTEND_URL || "http://localhost:3000";

// Images de territoires
export const createTerritoryImage = async (data: {
  userId: string
  territoryNumber: string
  imageType: 'standard' | 'large' | 'miniature'
  fileName: string
  filePath: string
  fileSize: number
  width?: number
  height?: number
  bbox?: string
  rotation?: number
  cropData?: string
}) => {
  const id = nanoid()

  const [result] = await db.insert(territoryImages).values({
    id,
    ...data
  })

  return { id, ...data }
}

export const getTerritoryImagesByUser = async (userId: string, territoryNumber?: string, imageType?: string) => {
  let whereConditions = [eq(territoryImages.userId, userId)]

  if (territoryNumber) {
    whereConditions.push(eq(territoryImages.territoryNumber, territoryNumber))
  }

  if (imageType) {
    whereConditions.push(eq(territoryImages.imageType, imageType))
  }

  return await db
    .select()
    .from(territoryImages)
    .where(and(...whereConditions))
    .orderBy(desc(territoryImages.createdAt))
}

export const getTerritoryImage = async (userId: string, territoryNumber: string, imageType: string) => {
  return await db
    .select()
    .from(territoryImages)
    .where(
      and(
        eq(territoryImages.userId, userId),
        eq(territoryImages.territoryNumber, territoryNumber),
        eq(territoryImages.imageType, imageType)
      )
    )
    .limit(1)
}

export const deleteTerritoryImage = async (userId: string, territoryNumber: string, imageType?: string) => {
  let whereConditions = [
    eq(territoryImages.userId, userId),
    eq(territoryImages.territoryNumber, territoryNumber)
  ]

  if (imageType) {
    whereConditions.push(eq(territoryImages.imageType, imageType))
  }

  // Récupérer les images à supprimer pour effacer aussi les fichiers
  const imagesToDelete = await db
    .select()
    .from(territoryImages)
    .where(and(...whereConditions))

  // Supprimer les entrées de la base de données
  await db
    .delete(territoryImages)
    .where(and(...whereConditions))
    
  // Retourner les chemins des fichiers pour pouvoir les supprimer
  return imagesToDelete.map(img => img.filePath)
}

// Données de territoires
export const saveTerritoryData = async (userId: string, gpxData: string) => {
  if (!gpxData || gpxData.trim() === '') {
    console.error('❌ Erreur: Tentative de sauvegarde avec des données GPX vides')
    return null
  }

  try {
    const existing = await db
      .select()
      .from(territoryData)
      .where(eq(territoryData.userId, userId))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(territoryData)
        .set({ data: gpxData, updatedAt: new Date() })
        .where(eq(territoryData.userId, userId))
      return existing[0]
    } else {
      const insertData = {
        userId,
        data: gpxData
      }
      try {
        await db.insert(territoryData).values(insertData)
        return { userId, gpxData }
      } catch (dbError) {
        console.error('❌ Erreur lors de l\'insertion en BDD:', dbError)
        throw dbError
      }
    }
  } catch (error) {
    console.error('❌ Erreur dans saveTerritoryData:', error)
    throw error
  }
}

export const getTerritoryDataByUser = async (userId: string) => {
  return await db
    .select()
    .from(territoryData)
    .where(eq(territoryData.userId, userId))
    .limit(1) // Un seul enregistrement par utilisateur
}

export const getTerritoryData = async (userId: string) => {
  return await db
    .select()
    .from(territoryData)
    .where(eq(territoryData.userId, userId))
    .limit(1)
}

export const deleteTerritoryData = async (userId: string) => {
  return await db
    .delete(territoryData)
    .where(eq(territoryData.userId, userId))
}

/**
 * Récupère les territoires reconstruits à partir du GPX
 */
export const getReconstructedTerritories = async (userId: string) => {
  const data = await getTerritoryData(userId)

  if (data.length === 0) {
    return []
  }

  const gpxData = data[0].data
  if (!gpxData) {
    return []
  }

  // Reconstruire les territoires à partir du GPX
  const territories = reconstructTerritoriesFromGpx(gpxData)

  // Récupérer les images pour chaque territoire
  if (territories.length > 0) {
    const images = await getTerritoryImagesByUser(userId);
    // Organiser les images par numéro de territoire et type
    const imagesByTerritory: Record<string, Record<string, string>> = {};

    images.forEach(img => {
      if (!imagesByTerritory[img.territoryNumber]) {
        imagesByTerritory[img.territoryNumber] = {};
      }

      imagesByTerritory[img.territoryNumber][img.imageType] = img.filePath;
    });    // Ajouter les URLs des images aux territoires
    territories.forEach(territory => {
      const territoryImages = imagesByTerritory[territory.num];

      if (territoryImages) {
        // Ajouter les URLs avec le préfixe complet pour le serveur statique
        // Image standard (principale)
        if (territoryImages['standard']) {
          territory.image = `${FRONTEND_URL}/api/p${territoryImages['standard']}`;
        }
        
        // Image originale standard
        if (territoryImages['original']) {
          territory.original = `${FRONTEND_URL}/api/p${territoryImages['original']}`;
        } else if (territoryImages['standard']) {
          // Fallback: utiliser l'image standard comme original si nécessaire
          territory.original = `${FRONTEND_URL}/api/p${territoryImages['standard']}`;
        }

        // Image large (agrandie)
        if (territoryImages['large']) {
          territory.large = `${FRONTEND_URL}/api/p${territoryImages['large']}`;
        }
        
        // Image originale large
        if (territoryImages['originalLarge']) {
          territory.originalLarge = `${FRONTEND_URL}/api/p${territoryImages['originalLarge']}`;
        } else if (territoryImages['large']) {
          // Fallback: utiliser l'image large comme originalLarge si nécessaire
          territory.originalLarge = `${FRONTEND_URL}/api/p${territoryImages['large']}`;
        }

        // Miniature
        if (territoryImages['miniature']) {
          territory.miniature = `${FRONTEND_URL}/api/p${territoryImages['miniature']}`;
        }

        // Si une image existe, le territoire n'est plus considéré comme par défaut
        if (territoryImages['standard'] || territoryImages['large']) {
          territory.isDefault = false
        }
      }
    })
  }

  return territories
}
