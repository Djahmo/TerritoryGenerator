import { eq, and, desc } from 'drizzle-orm'
import { db } from '../index.js'
import { territoryImages, territoryData, territoryLayers } from '../../schema/territories.js'
import { nanoid } from 'nanoid'
import { reconstructTerritoriesFromGpx } from '../../utils/gpxParser.js'
import env from '../../env.js'

// Constante pour l'URL frontend ou URL par défaut si env non défini
const FRONTEND_URL = env.FRONTEND_URL || "http://localhost:3000";

// Images de territoires
export const createTerritoryImage = async (data: {
  userId: string
  territoryNumber: string
  imageType: 'standard' | 'large' | 'miniature' | 'original' | 'originalLarge'
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

/**
 * Supprime uniquement les images modifiées d'un territoire (pas les originales)
 * Les types d'images originales à préserver : 'original', 'originalLarge'
 */
export const deleteModifiedTerritoryImages = async (userId: string, territoryNumber: string, imageType: 'standard' | 'large' | 'miniature') => {
  let whereConditions = [
    eq(territoryImages.userId, userId),
    eq(territoryImages.territoryNumber, territoryNumber),
    eq(territoryImages.imageType, imageType)
  ]

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
  const territories = reconstructTerritoriesFromGpx(gpxData)  // Récupérer les images et les layers pour chaque territoire
  if (territories.length > 0) {
    const images = await getTerritoryImagesByUser(userId);
    const allLayers = await getTerritoryLayersByUser(userId);

    // Organiser les images par numéro de territoire et type
    const imagesByTerritory: Record<string, Record<string, string>> = {};

    // Organiser les layers par numéro de territoire et type d'image
    const layersByTerritory: Record<string, { paintLayersImage: any[], paintLayersLarge: any[] }> = {};

    images.forEach(img => {
      if (!imagesByTerritory[img.territoryNumber]) {
        imagesByTerritory[img.territoryNumber] = {};
      }
      imagesByTerritory[img.territoryNumber][img.imageType] = img.filePath;
    });

    allLayers.forEach(layer => {
      if (!layersByTerritory[layer.territoryNumber]) {
        layersByTerritory[layer.territoryNumber] = {
          paintLayersImage: [],
          paintLayersLarge: []
        };
      }      // Convertir le layer de la base de données vers le format PaintLayer
      const paintLayer = {
        id: layer.id,
        visible: layer.visible,
        locked: layer.locked,
        style: JSON.parse(layer.style),
        timestamp: layer.createdAt ? new Date(layer.createdAt).getTime() : Date.now(),
        type: layer.layerType,
        data: JSON.parse(layer.layerData)
      };

      if (layer.imageType === 'standard') {
        layersByTerritory[layer.territoryNumber].paintLayersImage.push(paintLayer);
      } else if (layer.imageType === 'large') {
        layersByTerritory[layer.territoryNumber].paintLayersLarge.push(paintLayer);
      }
    });

    // Ajouter les URLs des images et les layers aux territoires
    territories.forEach((territory: any) => {
      const territoryImages = imagesByTerritory[territory.num];
      const territoryLayers = layersByTerritory[territory.num];

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

      // Ajouter les layers de peinture au territoire
      if (territoryLayers) {
        territory.paintLayersImage = territoryLayers.paintLayersImage;
        territory.paintLayersLarge = territoryLayers.paintLayersLarge;
      } else {
        // Initialiser des tableaux vides si aucun layer n'existe
        territory.paintLayersImage = [];
        territory.paintLayersLarge = [];
      }
    })
  }

  return territories
}

// Layers de territoires
export const createTerritoryLayer = async (data: {
  userId: string
  territoryNumber: string
  imageType: 'standard' | 'large'
  layerType: 'brush' | 'line' | 'arrow' | 'circle' | 'rectangle' | 'text' | 'parking' | 'compass'
  layerData: string
  style: string
  visible?: boolean
  locked?: boolean
}) => {
  const id = nanoid()

  const [result] = await db.insert(territoryLayers).values({
    id,
    userId: data.userId,
    territoryNumber: data.territoryNumber,
    imageType: data.imageType,
    visible: data.visible ?? true,
    locked: data.locked ?? false,
    style: data.style,
    layerType: data.layerType,
    layerData: data.layerData
    // createdAt et updatedAt seront automatiquement définis par la base de données
  })

  return {
    id,
    userId: data.userId,
    territoryNumber: data.territoryNumber,
    imageType: data.imageType,
    visible: data.visible ?? true,
    locked: data.locked ?? false,
    style: data.style,
    layerType: data.layerType,
    layerData: data.layerData
  }
}

export const getTerritoryLayersByUser = async (userId: string, territoryNumber?: string, imageType?: string) => {
  let whereConditions = [eq(territoryLayers.userId, userId)]

  if (territoryNumber) {
    whereConditions.push(eq(territoryLayers.territoryNumber, territoryNumber))
  }

  if (imageType) {
    whereConditions.push(eq(territoryLayers.imageType, imageType))
  }

  return await db
    .select()
    .from(territoryLayers)
    .where(and(...whereConditions))
    .orderBy(desc(territoryLayers.createdAt))
}

export const getTerritoryLayer = async (userId: string, layerId: string) => {
  const result = await db
    .select()
    .from(territoryLayers)
    .where(and(
      eq(territoryLayers.userId, userId),
      eq(territoryLayers.id, layerId)
    ))
    .limit(1)

  return result.length > 0 ? result[0] : null
}

export const updateTerritoryLayer = async (userId: string, layerId: string, updates: {
  visible?: boolean
  locked?: boolean
  style?: string
  layerData?: string
}) => {
  await db
    .update(territoryLayers)
    .set({
      ...updates,
      updatedAt: new Date()
    })
    .where(and(
      eq(territoryLayers.userId, userId),
      eq(territoryLayers.id, layerId)
    ))

  // Vérifier si le layer existe après la mise à jour
  const layer = await getTerritoryLayer(userId, layerId)
  return layer !== null
}

export const deleteTerritoryLayer = async (userId: string, layerId: string) => {
  // Vérifier si le layer existe avant suppression
  const layer = await getTerritoryLayer(userId, layerId)
  if (!layer) {
    return false
  }

  await db
    .delete(territoryLayers)
    .where(and(
      eq(territoryLayers.userId, userId),
      eq(territoryLayers.id, layerId)
    ))

  return true
}

export const deleteTerritoryLayersByTerritory = async (userId: string, territoryNumber: string, imageType?: string) => {
  let whereConditions = [
    eq(territoryLayers.userId, userId),
    eq(territoryLayers.territoryNumber, territoryNumber)
  ]

  if (imageType) {
    whereConditions.push(eq(territoryLayers.imageType, imageType))
  }

  // Compter les layers à supprimer
  const layersToDelete = await db
    .select()
    .from(territoryLayers)
    .where(and(...whereConditions))

  await db
    .delete(territoryLayers)
    .where(and(...whereConditions))

  return layersToDelete.length
}

/**
 * Sauvegarde plusieurs layers en une fois
 * Supprime tous les anciens layers du territoire avant d'ajouter les nouveaux
 */
export const saveTerritoryLayers = async (
  userId: string,
  territoryNumber: string,
  imageType: 'standard' | 'large',
  layers: Array<{
    id?: string
    type: string
    visible: boolean
    locked: boolean
    style: any
    data: any
  }>
) => {
  // Supprimer tous les anciens layers de ce territoire et type d'image
  await deleteTerritoryLayersByTerritory(userId, territoryNumber, imageType)

  // Ajouter les nouveaux layers
  const savedLayers = []
  for (const layer of layers) {
    const savedLayer = await createTerritoryLayer({
      userId,
      territoryNumber,
      imageType,
      layerType: layer.type as 'brush' | 'line' | 'arrow' | 'circle' | 'rectangle' | 'text' | 'parking' | 'compass',
      layerData: JSON.stringify(layer.data),
      style: JSON.stringify(layer.style),
      visible: layer.visible,
      locked: layer.locked
    })
    savedLayers.push(savedLayer)
  }

  return savedLayers
}
