import { eq, and, desc } from 'drizzle-orm'
import { db } from '../index.js'
import { images, territories, layers } from '../../schema/territories.js'
import { nanoid } from 'nanoid'
import { reconstructTerritoriesFromGpx } from '../../utils/gpxParser.js'
import env from '../../env.js'
import path from 'path'
import { promises as fs } from 'fs'

// Constante pour l'URL frontend ou URL par défaut si env non défini
const FRONTEND_URL = env.FRONTEND_URL || "http://localhost:3000";

// Fonction utilitaire pour générer le nom de fichier basé sur le territoire et le type
export const generateFileName = (territoryNumber: string, imageType: string): string => {
  const extension = imageType === 'miniature' ? 'webp' : 'png'
  return `${territoryNumber}-${imageType}.${extension}`
}

// Fonctions utilitaires pour les fichiers
export const getImageFileName = (territoryNumber: string, imageType: string): string => {
  const extension = imageType === 'miniature' ? 'webp' : 'png'
  return `${territoryNumber}-${imageType}.${extension}`
}

export const getImageFilePath = (userId: string, territoryNumber: string, imageType: string): string => {
  return `/${userId}/${getImageFileName(territoryNumber, imageType)}`
}

export const getImageFileSize = async (userId: string, territoryNumber: string, imageType: string): Promise<number> => {
  try {
    const filePath = path.join(process.cwd(), 'public', userId, getImageFileName(territoryNumber, imageType))
    const stats = await fs.stat(filePath)
    return stats.size
  } catch {
    return 0
  }
}

// Images de territoires
export const createTerritoryImage = async (data: {
  userId: string
  territoryNumber: string
  imageType: 'standard' | 'large' | 'miniature' | 'original' | 'originalLarge'
  width?: number
  height?: number
  bbox?: string
  rotation?: number
  cropData?: string
}) => {
  // Supprimer l'ancienne entrée s'il y en a une
  await db.delete(images).where(
    and(
      eq(images.userId, data.userId),
      eq(images.territoryNumber, data.territoryNumber),
      eq(images.imageType, data.imageType)
    )
  )

  const id = nanoid()
  const fileName = generateFileName(data.territoryNumber, data.imageType)

  const [result] = await db.insert(images).values({
    id,
    fileName,
    ...data
  })

  return { id, fileName, ...data }
}

export const getTerritoryImagesByUser = async (userId: string, territoryNumber?: string, imageType?: string) => {
  let whereConditions = [eq(images.userId, userId)]

  if (territoryNumber) {
    whereConditions.push(eq(images.territoryNumber, territoryNumber))
  }

  if (imageType) {
    whereConditions.push(eq(images.imageType, imageType))
  }

  return await db
    .select()
    .from(images)
    .where(and(...whereConditions))
    .orderBy(desc(images.createdAt))
}

export const getTerritoryImage = async (userId: string, territoryNumber: string, imageType: string) => {
  return await db
    .select()
    .from(images)
    .where(
      and(
        eq(images.userId, userId),
        eq(images.territoryNumber, territoryNumber),
        eq(images.imageType, imageType)
      )
    )
    .limit(1)
}

export const deleteTerritoryImage = async (userId: string, territoryNumber: string, imageType?: string) => {
  let whereConditions = [
    eq(images.userId, userId),
    eq(images.territoryNumber, territoryNumber)
  ]

  if (imageType) {
    whereConditions.push(eq(images.imageType, imageType))
  }

  // Récupérer les images à supprimer pour effacer aussi les fichiers
  const imagesToDelete = await db
    .select()
    .from(images)
    .where(and(...whereConditions))
  // Supprimer les entrées de la base de données
  await db
    .delete(images)
    .where(and(...whereConditions))

  // Retourner les chemins des fichiers pour pouvoir les supprimer
  return imagesToDelete.map(img => path.join(process.cwd(), 'public', getImageFilePath(img.userId, img.territoryNumber, img.imageType)))
}

/**
 * Supprime uniquement les images modifiées d'un territoire (pas les originales)
 * Les types d'images originales à préserver : 'original', 'originalLarge'
 */
export const deleteModifiedTerritoryImages = async (userId: string, territoryNumber: string, imageType: 'standard' | 'large' | 'miniature') => {
  let whereConditions = [
    eq(images.userId, userId),
    eq(images.territoryNumber, territoryNumber),
    eq(images.imageType, imageType)
  ]

  // Récupérer les images à supprimer pour effacer aussi les fichiers
  const imagesToDelete = await db
    .select()
    .from(images)
    .where(and(...whereConditions))
  // Supprimer les entrées de la base de données
  await db
    .delete(images)
    .where(and(...whereConditions))

  // Retourner les chemins des fichiers pour pouvoir les supprimer
  return imagesToDelete.map(img => path.join(process.cwd(), 'public', getImageFilePath(img.userId, img.territoryNumber, img.imageType)))
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
      .from(territories)
      .where(eq(territories.userId, userId))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(territories)
        .set({ data: gpxData, updatedAt: new Date() })
        .where(eq(territories.userId, userId))
      return existing[0]
    } else {
      const insertData = {
        userId,
        data: gpxData
      }
      try {
        await db.insert(territories).values(insertData)
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
    .from(territories)
    .where(eq(territories.userId, userId))
    .limit(1) // Un seul enregistrement par utilisateur
}

export const getTerritoryData = async (userId: string) => {
  return await db
    .select()
    .from(territories)
    .where(eq(territories.userId, userId))
    .limit(1)
}

export const deleteTerritoryData = async (userId: string) => {
  return await db
    .delete(territories)
    .where(eq(territories.userId, userId))
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
  const territoriesData = reconstructTerritoriesFromGpx(gpxData)

  // Récupérer les images et les layers pour chaque territoire
  if (territoriesData.length > 0) {
    const imagesData = await getTerritoryImagesByUser(userId);
    const allLayers = await getTerritoryLayersByUser(userId);

    // Organiser les images par numéro de territoire et type
    const imagesByTerritory: Record<string, Record<string, any>> = {};

    // Organiser les layers par numéro de territoire et type d'image
    const layersByTerritory: Record<string, { paintLayersImage: any[], paintLayersLarge: any[] }> = {};

    imagesData.forEach(img => {
      if (!imagesByTerritory[img.territoryNumber]) {
        imagesByTerritory[img.territoryNumber] = {};
      }      imagesByTerritory[img.territoryNumber][img.imageType] = {
        rotation: img.rotation
      };
    });

    allLayers.forEach(layer => {
      if (!layersByTerritory[layer.territoryNumber]) {
        layersByTerritory[layer.territoryNumber] = {
          paintLayersImage: [],
          paintLayersLarge: []
        };
      }

      // Convertir le layer de la base de données vers le format PaintLayer
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
    territoriesData.forEach((territory: any) => {
      const territoryImages = imagesByTerritory[territory.num];
      const territoryLayers = layersByTerritory[territory.num];

      if (territoryImages) {
        // Récupérer la rotation depuis les métadonnées de l'image originale (priorité) ou standard
        const originalImage = territoryImages['original'] || territoryImages['standard'];
        if (originalImage && originalImage.rotation !== null && originalImage.rotation !== undefined) {
          territory.rotation = originalImage.rotation;
        }        // Ajouter les URLs avec le préfixe complet pour le serveur statique
        // Image standard (principale)
        if (territoryImages['standard']) {
          territory.image = `${FRONTEND_URL}/api/p${getImageFilePath(userId, territory.num, 'standard')}`;
        }

        // Image originale standard
        if (territoryImages['original']) {
          territory.original = `${FRONTEND_URL}/api/p${getImageFilePath(userId, territory.num, 'original')}`;
        } else if (territoryImages['standard']) {
          // Fallback: utiliser l'image standard comme original si nécessaire
          territory.original = `${FRONTEND_URL}/api/p${getImageFilePath(userId, territory.num, 'standard')}`;
        }

        // Image large (agrandie)
        if (territoryImages['large']) {
          territory.large = `${FRONTEND_URL}/api/p${getImageFilePath(userId, territory.num, 'large')}`;
        }

        // Image originale large
        if (territoryImages['originalLarge']) {
          territory.originalLarge = `${FRONTEND_URL}/api/p${getImageFilePath(userId, territory.num, 'originalLarge')}`;
        } else if (territoryImages['large']) {
          // Fallback: utiliser l'image large comme originalLarge si nécessaire
          territory.originalLarge = `${FRONTEND_URL}/api/p${getImageFilePath(userId, territory.num, 'large')}`;
        }

        // Miniature
        if (territoryImages['miniature']) {
          territory.miniature = `${FRONTEND_URL}/api/p${getImageFilePath(userId, territory.num, 'miniature')}`;
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

  return territoriesData
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

  const [result] = await db.insert(layers).values({
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
  let whereConditions = [eq(layers.userId, userId)]

  if (territoryNumber) {
    whereConditions.push(eq(layers.territoryNumber, territoryNumber))
  }

  if (imageType) {
    whereConditions.push(eq(layers.imageType, imageType))
  }

  return await db
    .select()
    .from(layers)
    .where(and(...whereConditions))
    .orderBy(desc(layers.createdAt))
}

export const getTerritoryLayer = async (userId: string, layerId: string) => {
  const result = await db
    .select()
    .from(layers)
    .where(and(
      eq(layers.userId, userId),
      eq(layers.id, layerId)
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
    .update(layers)
    .set({
      ...updates,
      updatedAt: new Date()
    })
    .where(and(
      eq(layers.userId, userId),
      eq(layers.id, layerId)
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
    .delete(layers)
    .where(and(
      eq(layers.userId, userId),
      eq(layers.id, layerId)
    ))

  return true
}

export const deleteTerritoryLayersByTerritory = async (userId: string, territoryNumber: string, imageType?: string) => {
  let whereConditions = [
    eq(layers.userId, userId),
    eq(layers.territoryNumber, territoryNumber)
  ]

  if (imageType) {
    whereConditions.push(eq(layers.imageType, imageType))
  }

  // Compter les layers à supprimer
  const layersToDelete = await db
    .select()
    .from(layers)
    .where(and(...whereConditions))

  await db
    .delete(layers)
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
  layersData: Array<{
    id?: string
    type: string
    visible: boolean
    locked: boolean
    style: any
    data: any
  }>
) => {  // Supprimer tous les anciens layers de ce territoire et type d'image
  await deleteTerritoryLayersByTerritory(userId, territoryNumber, imageType)

  // Ajouter les nouveaux layers
  const savedLayers = []
  for (const layer of layersData) {
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
