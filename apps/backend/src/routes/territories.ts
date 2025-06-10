import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import sharp from 'sharp'
import { TerritoryImageService } from '../services/territoryImageService.js'
import {
  createTerritoryImage,
  getTerritoryImagesByUser,
  getTerritoryImage,
  deleteTerritoryImage,
  saveTerritoryData,
  getTerritoryData,
  getReconstructedTerritories,
  createTerritoryLayer,
  getTerritoryLayersByUser,
  getTerritoryLayer,
  updateTerritoryLayer,
  deleteTerritoryLayer,
  deleteTerritoryLayersByTerritory,
  getImageFileName,
  getImageFilePath
} from '../db/territories/index.js'
import { getUserConfig } from '../db/userConfig/index.js'
import getAuthUser from '../lib/secure/auth.js'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Schémas de validation
const coordSchema = z.object({
  lat: z.number(),
  lon: z.number()
})

const territorySchema = z.object({
  num: z.string(),
  polygon: z.array(coordSchema),
  name: z.string(),
  rotation: z.number().optional(),
  currentBboxLarge: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional()
})

const generateImageSchema = z.object({
  territory: territorySchema,
  imageType: z.enum(['standard', 'large']),
  options: z.object({
    contourColor: z.string().optional(),
    contourWidth: z.number().optional()
  }).optional()
})

const generateImageWithCropSchema = z.object({
  territory: territorySchema,
  customBbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  cropData: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    imageWidth: z.number(),
    imageHeight: z.number()
  }).optional(),
  options: z.object({
    contourColor: z.string().optional(),
    contourWidth: z.number().optional()
  }).optional()
})

const saveTerritoryDataSchema = z.object({
  gpxData: z.string()
})

const updateTerritoryCompleteSchema = z.object({
  territory: territorySchema,
  images: z.object({
    image: z.string().optional(),
    large: z.string().optional(),
    miniature: z.string().optional()
  }),
  layers: z.object({
    paintLayersImage: z.array(z.any()).optional(),
    paintLayersLarge: z.array(z.any()).optional()
  })
})

// Schémas pour les routes de layers
const layerSchema = z.object({
  territoryNumber: z.string(),
  imageType: z.enum(['standard', 'large']),
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  style: z.string(), // JSON stringifié
  layerType: z.enum(['brush', 'line', 'arrow', 'circle', 'rectangle', 'text', 'parking', 'compass']),
  layerData: z.string(), // JSON stringifié
})

const updateLayerSchema = z.object({
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  style: z.string().optional(),
  layerData: z.string().optional(),
})

export const registerTerritoryRoutes = (app: FastifyInstance) => {  // Route pour générer une image de territoire
  app.post('/generate-image', async (request, reply) => {
    const user = await getAuthUser(request)
    if (!user) {
      return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
    }

    const parse = generateImageSchema.safeParse(request.body)
    if (!parse.success) {
      return reply.status(400).send({ errors: parse.error.errors })
    } try {
      const { territory, imageType, options = {} } = parse.data
      const userId = user.id

      console.log(`🎯 Génération d'image demandée - Type: ${imageType}, Territoire: ${territory.num}, User: ${userId}`);

      // Récupérer la configuration utilisateur de la base de données
      const userConfig = await getUserConfig(userId)

      // Créer le service de génération d'images avec la config utilisateur
      const serviceConfig = {
        ppp: userConfig.ppp,
        largeFactor: parseFloat(userConfig.largeFactor)
      }

      // Calculer les dimensions basées sur la configuration utilisateur
      const PAPER_WIDTH_CM = 29.7 // A4 width in cm (constant)
      const PHI = 1.618033988749

      const getResolution = (pW: number, rX: number, rY: number, p: number) => {
        let widthCm: number
        let heightCm: number

        if (rX >= rY) {
          widthCm = pW
          heightCm = (pW * rY) / rX
        } else {
          heightCm = pW
          widthCm = (pW * rX) / rY
        }

        const widthPx = Math.round((widthCm / 2.54) * p)
        const heightPx = Math.round((heightCm / 2.54) * p)
        return { widthPx, heightPx }
      }

      const { widthPx: finalWidth, heightPx: finalHeight } = getResolution(
        PAPER_WIDTH_CM, parseFloat(userConfig.ratioX), parseFloat(userConfig.ratioY), userConfig.ppp
      )

      const { widthPx: largeFinalWidth, heightPx: largeFinalHeight } = getResolution(
        PAPER_WIDTH_CM, parseFloat(userConfig.largeRatioX), parseFloat(userConfig.largeRatioY), userConfig.ppp
      )

      const rawSize = Math.round(Math.max(finalWidth, finalHeight) * PHI)
      const largeRawSize = Math.round(Math.max(largeFinalWidth, largeFinalHeight) * PHI)

      const dimensions = {
        finalWidth,
        finalHeight,
        rawSize,
        largeFinalWidth,
        largeFinalHeight,
        largeRawSize
      }

      const userConfigOptions = {
        contourColor: userConfig.contourColor,
        contourWidth: userConfig.contourWidth,
        thumbnailWidth: userConfig.thumbnailWidth,
        ignApiBaseUrl: userConfig.ignApiBaseUrl,
        ignApiLayer: userConfig.ignApiLayer,
        ignApiFormat: userConfig.ignApiFormat,
        ignApiCRS: userConfig.ignApiCRS,
        networkRetries: userConfig.networkRetries,
        networkDelay: userConfig.networkDelay,
        ignApiRateLimit: userConfig.ignApiRateLimit,
        ...options // Les options passées en paramètre prennent le dessus
      }
      const imageService = new TerritoryImageService(
        serviceConfig,
        dimensions,
        PHI,
        userConfigOptions
      )

      let imageData: string
      const imageId = nanoid()
      let result: any

      if (imageType === 'standard') {
        result = await imageService.generateStandardImage(territory, options);
        imageData = result.image;

        // Créer le dossier utilisateur
        const userDir = path.join(__dirname, '../../public', userId);
        await fs.mkdir(userDir, { recursive: true }); const base64Data = imageData.replace(/^data:image\/png;base64,/, '');

        // 1. Sauvegarder l'image ORIGINALE (copie de l'image générée)
        const originalFileName = getImageFileName(territory.num, 'original');
        const originalFilePath = path.join(userDir, originalFileName);
        const originalBuffer = Buffer.from(base64Data, 'base64');
        await fs.writeFile(originalFilePath, originalBuffer);

        await createTerritoryImage({
          userId,
          territoryNumber: territory.num,
          imageType: 'original',
          width: dimensions.finalWidth,
          height: dimensions.finalHeight,
          rotation: territory.rotation
        });        // 2. Sauvegarder l'image STANDARD (copie du fichier original pour éviter la corruption)
        const standardFileName = getImageFileName(territory.num, 'standard');
        const standardFilePath = path.join(userDir, standardFileName);
        await fs.copyFile(originalFilePath, standardFilePath);

        await createTerritoryImage({
          userId,
          territoryNumber: territory.num,
          imageType: 'standard',
          width: dimensions.finalWidth,
          height: dimensions.finalHeight,
          rotation: territory.rotation
        });

        // 3. Créer et sauvegarder la MINIATURE
        if (result.miniature) {
          const thumbnailFileName = getImageFileName(territory.num, 'miniature');

          // Convertir la miniature PNG en WebP avec sharp
          const thumbnailBase64 = result.miniature.replace(/^data:image\/png;base64,/, '');
          const thumbnailBuffer = Buffer.from(thumbnailBase64, 'base64');

          // Convertir en WebP avec sharp
          const webpBuffer = await sharp(thumbnailBuffer)
            .webp({ quality: 80 })
            .toBuffer();

          const thumbnailPath = path.join(userDir, thumbnailFileName);
          await fs.writeFile(thumbnailPath, webpBuffer);          // Sauvegarder les métadonnées de la miniature
          await createTerritoryImage({
            userId,
            territoryNumber: territory.num,
            imageType: 'miniature',
            width: userConfig.thumbnailWidth,
            height: Math.round(dimensions.finalHeight / dimensions.finalWidth * userConfig.thumbnailWidth)
          });
        }

        return reply.send({ success: true });
      } else if (imageType === 'large') {
        const imageResult = await imageService.generateLargeImage(territory, options);
        imageData = imageResult.dataUrl;

        // Créer le dossier utilisateur
        const userDir = path.join(__dirname, '../../public', userId);
        await fs.mkdir(userDir, { recursive: true }); const base64Data = imageData.replace(/^data:image\/png;base64,/, '');

        // 1. Sauvegarder l'image ORIGINALE LARGE (copie de l'image générée)
        const originalLargeFileName = getImageFileName(territory.num, 'originalLarge');
        const originalLargeFilePath = path.join(userDir, originalLargeFileName);
        const originalLargeBuffer = Buffer.from(base64Data, 'base64');
        await fs.writeFile(originalLargeFilePath, originalLargeBuffer);        await createTerritoryImage({
          userId,
          territoryNumber: territory.num,
          imageType: 'originalLarge',
          width: imageResult.width,
          height: imageResult.height,
          bbox: JSON.stringify(imageResult.bbox), // 🎯 Sauvegarder le bbox !
          rotation: territory.rotation
        });

        // 2. Sauvegarder l'image LARGE (copie du fichier originalLarge pour éviter la corruption)
        const largeFileName = getImageFileName(territory.num, 'large');
        const largeFilePath = path.join(userDir, largeFileName);
        await fs.copyFile(originalLargeFilePath, largeFilePath);        await createTerritoryImage({
          userId,
          territoryNumber: territory.num,
          imageType: 'large',
          width: imageResult.width,
          height: imageResult.height,
          bbox: JSON.stringify(imageResult.bbox), // 🎯 Sauvegarder le bbox !          rotation: territory.rotation
        });

        // 🛡️ Vérifier que les fichiers existent avant de retourner le succès
        let retries = 0;
        const maxRetries = 10;
        const retryDelay = 100; // ms

        while (retries < maxRetries) {
          try {
            await fs.access(originalLargeFilePath);
            await fs.access(largeFilePath);
            console.log('✅ Fichiers large vérifiés comme existants après', retries, 'tentatives');
            break;
          } catch (error) {
            retries++;
            if (retries >= maxRetries) {
              throw new Error(`Fichiers large non créés après ${maxRetries} tentatives`);
            }
            console.log(`⏳ Attente fichiers large (tentative ${retries}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }

        return reply.send({ success: true });
      } else {
        return reply.status(400).send({ error: 'Type d\'image non supporté' })
      }
    } catch (error) {
      console.error(error)
      return reply.status(500).send({
        error: 'Erreur lors de la génération de l\'image',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  })

  // Route pour générer une image avec crop personnalisé
  app.post('/generate-image-with-crop', async (request, reply) => {
    const user = await getAuthUser(request)
    if (!user) {
      return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
    }

    const parse = generateImageWithCropSchema.safeParse(request.body)
    if (!parse.success) {
      return reply.status(400).send({ errors: parse.error.errors })
    }    try {
      const { territory, customBbox, cropData, options = {} } = parse.data
      const userId = user.id

      console.log('🎯 Génération avec crop demandée:', {
        territory: territory.num,
        customBbox,
        cropData
      })      // Si on a des données de crop, on doit calculer le nouveau bbox à partir de l'image existante
      let finalBbox = customBbox
      console.log('📦 CustomBbox reçu du frontend:', customBbox)
      
      if (cropData) {
        console.log('✂️ CropData reçu:', cropData)
        // Récupérer l'image originalLarge existante pour connaître son bbox
        const existingImage = await getTerritoryImage(userId, territory.num, 'originalLarge')
        console.log('🔍 Image originalLarge trouvée:', existingImage.length > 0 ? 'OUI' : 'NON')
        
        if (existingImage.length > 0 && existingImage[0].bbox) {
          const currentBbox = JSON.parse(existingImage[0].bbox) as [number, number, number, number]
          console.log('📍 Bbox actuel de l\'image originalLarge:', currentBbox)
          
          // Calculer le nouveau bbox en fonction du crop (en %)
          // currentBbox format: [minLon, minLat, maxLon, maxLat]
          const [minLon, minLat, maxLon, maxLat] = currentBbox
          const bboxWidth = maxLon - minLon
          const bboxHeight = maxLat - minLat
          
          console.log('📏 Dimensions du bbox actuel:', { bboxWidth, bboxHeight })
            // Convertir les coordonnées de crop (déjà en décimal 0-1) en coordonnées GPS
          // IMPORTANT: cropData.y est inversé car les coordonnées Y d'image (0 en haut) 
          // sont inversées par rapport aux coordonnées GPS (latitude croissante vers le nord)
          const newMinLon = minLon + cropData.x * bboxWidth
          const newMaxLon = minLon + (cropData.x + cropData.width) * bboxWidth
          const newMaxLat = maxLat - cropData.y * bboxHeight  // Inversé !
          const newMinLat = maxLat - (cropData.y + cropData.height) * bboxHeight  // Inversé !
          
          finalBbox = [newMinLon, newMinLat, newMaxLon, newMaxLat]
          console.log('📍 Nouveau bbox calculé pour crop:', {
            cropData,
            currentBbox,
            newBbox: finalBbox,            calculs: {
              newMinLon: `${minLon} + ${cropData.x} * ${bboxWidth} = ${newMinLon}`,
              newMaxLon: `${minLon} + ${cropData.x + cropData.width} * ${bboxWidth} = ${newMaxLon}`,
              newMaxLat: `${maxLat} - ${cropData.y} * ${bboxHeight} = ${newMaxLat}`,
              newMinLat: `${maxLat} - ${cropData.y + cropData.height} * ${bboxHeight} = ${newMinLat}`
            }
          })
        } else {
          console.log('⚠️ Pas de bbox existant pour originalLarge, utilisation du bbox fourni par le frontend')
          console.log('⚠️ ATTENTION: Cela peut être la source du problème si le bbox frontend est incorrect!')
        }
      }

      // Récupérer la configuration utilisateur de la base de données
      const userConfig = await getUserConfig(userId)      // Créer le service de génération d'images avec la config utilisateur
      const serviceConfig = {
        ppp: userConfig.ppp,
        largeFactor: parseFloat(userConfig.largeFactor)
      }

      // Calculer les dimensions basées sur la configuration utilisateur
      const PAPER_WIDTH_CM = 29.7 // A4 width in cm (constant)
      const PHI = 1.618033988749

      const getResolution = (pW: number, rX: number, rY: number, p: number) => {
        let widthCm: number
        let heightCm: number

        if (rX >= rY) {
          widthCm = pW
          heightCm = (pW * rY) / rX
        } else {
          heightCm = pW
          widthCm = (pW * rX) / rY
        }

        const widthPx = Math.round((widthCm / 2.54) * p)
        const heightPx = Math.round((heightCm / 2.54) * p)
        return { widthPx, heightPx }
      }

      const { widthPx: finalWidth, heightPx: finalHeight } = getResolution(
        PAPER_WIDTH_CM, parseFloat(userConfig.ratioX), parseFloat(userConfig.ratioY), userConfig.ppp
      )

      const { widthPx: largeFinalWidth, heightPx: largeFinalHeight } = getResolution(
        PAPER_WIDTH_CM, parseFloat(userConfig.largeRatioX), parseFloat(userConfig.largeRatioY), userConfig.ppp
      )

      const rawSize = Math.round(Math.max(finalWidth, finalHeight) * PHI)
      const largeRawSize = Math.round(Math.max(largeFinalWidth, largeFinalHeight) * PHI)

      const dimensions = {
        finalWidth,
        finalHeight,
        rawSize,
        largeFinalWidth,
        largeFinalHeight,
        largeRawSize
      }

      const userConfigOptions = {
        contourColor: userConfig.contourColor,
        contourWidth: userConfig.contourWidth,
        thumbnailWidth: userConfig.thumbnailWidth,
        ignApiBaseUrl: userConfig.ignApiBaseUrl,
        ignApiLayer: userConfig.ignApiLayer,
        ignApiFormat: userConfig.ignApiFormat,
        ignApiCRS: userConfig.ignApiCRS,
        networkRetries: userConfig.networkRetries,
        networkDelay: userConfig.networkDelay,
        ignApiRateLimit: userConfig.ignApiRateLimit,
        ...options // Les options passées en paramètre prennent le dessus
      }

      const imageService = new TerritoryImageService(
        serviceConfig,        dimensions,
        PHI,
        userConfigOptions
      )

      const croppedImageResult = await imageService.generateLargeImageWithCustomBbox(
        territory,
        finalBbox, // Utiliser le bbox calculé (ou fourni)
        options,
        cropData
      )

      // Créer le dossier utilisateur
      const userDir = path.join(__dirname, '../../public', userId)
      await fs.mkdir(userDir, { recursive: true });

      const base64Data = croppedImageResult.dataUrl.replace(/^data:image\/png;base64,/, '')

      // 1. Sauvegarder l'image ORIGINALE LARGE (copie de l'image générée avec crop)
      const originalLargeFileName = getImageFileName(territory.num, 'originalLarge');
      const originalLargeFilePath = path.join(userDir, originalLargeFileName);
      const originalLargeBuffer = Buffer.from(base64Data, 'base64');
      await fs.writeFile(originalLargeFilePath, originalLargeBuffer);      await createTerritoryImage({
        userId,
        territoryNumber: territory.num,
        imageType: 'originalLarge',
        width: croppedImageResult.width,
        height: croppedImageResult.height,
        bbox: JSON.stringify(finalBbox), // Utiliser le bbox final calculé
        cropData: cropData ? JSON.stringify(cropData) : undefined
      });

      // 2. Sauvegarder l'image LARGE (copie du fichier originalLarge pour éviter la corruption)
      const largeFileName = getImageFileName(territory.num, 'large');
      const largeFilePath = path.join(userDir, largeFileName);
      await fs.copyFile(originalLargeFilePath, largeFilePath);      await createTerritoryImage({
        userId,
        territoryNumber: territory.num,
        imageType: 'large',
        width: croppedImageResult.width,
        height: croppedImageResult.height,
        bbox: JSON.stringify(finalBbox), // Utiliser le bbox final calculé        cropData: cropData ? JSON.stringify(cropData) : undefined
      });

      // 🛡️ IMPORTANT: Vérifier que les fichiers existent réellement avant de retourner le succès
      // Cela évite le problème de cache/timing où le frontend essaie de charger une image pas encore écrite
      let retries = 0;
      const maxRetries = 10;
      const retryDelay = 100; // ms

      while (retries < maxRetries) {
        try {
          await fs.access(originalLargeFilePath);
          await fs.access(largeFilePath);
          console.log('✅ Fichiers crop vérifiés comme existants après', retries, 'tentatives');
          break;
        } catch (error) {
          retries++;
          if (retries >= maxRetries) {
            throw new Error(`Fichiers non créés après ${maxRetries} tentatives`);
          }
          console.log(`⏳ Attente fichiers crop (tentative ${retries}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }

      return reply.send({
        success: true
      })
    } catch (error) {
      console.error(error)
      return reply.status(500).send({
        error: 'Erreur lors de la génération de l\'image avec crop',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  })

  // Route pour obtenir les images d'un utilisateur
  app.get('/images', async (request, reply) => {
    const user = await getAuthUser(request)
    if (!user) {
      return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
    }

    try {
      const userId = user.id
      console.log(userId)
      const { territoryNumber, imageType } = request.query as { territoryNumber?: string, imageType?: string }

      const images = await getTerritoryImagesByUser(userId, territoryNumber, imageType);

      return reply.send({
        success: true,
        images: images.map(img => ({
          ...img,
          imageUrl: `/p/${userId}/${getImageFileName(img.territoryNumber, img.imageType)}`
        }))
      })

    } catch (error) {
      console.error(error)
      return reply.status(500).send({
        error: 'Erreur lors de la récupération des images',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  })

  // Route pour supprimer une image
  app.delete('/images/:territoryNumber/:imageType', async (request, reply) => {
    const user = await getAuthUser(request)
    if (!user) {
      return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
    }

    try {
      const userId = user.id
      const { territoryNumber, imageType } = request.params as { territoryNumber: string, imageType: string }      // Récupérer l'image avant suppression pour supprimer le fichier
      const image = await getTerritoryImage(userId, territoryNumber, imageType);

      if (image.length > 0) {
        const imagePath = getImageFilePath(userId, territoryNumber, imageType);
        const filePath = path.join(__dirname, '../../public', imagePath);
        try {
          await fs.unlink(filePath);
        } catch (err) {
          // Ignorer les erreurs de suppression de fichier
          console.warn(`Impossible de supprimer le fichier: ${filePath}`);
        }
      }

      await deleteTerritoryImage(userId, territoryNumber, imageType)

      return reply.send({
        success: true,
        message: 'Image supprimée avec succès'
      })

    } catch (error) {
      console.error(error)
      return reply.status(500).send({
        error: 'Erreur lors de la suppression de l\'image',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  })  // Route pour sauvegarder les données de territoire (GPX, etc.)
  app.post('/data', async (request, reply) => {
    const user = await getAuthUser(request)
    if (!user) {
      return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
    }

    const parse = saveTerritoryDataSchema.safeParse(request.body)
    if (!parse.success) {
      console.error('❌ Erreur de validation:', parse.error.errors)
      return reply.status(400).send({ errors: parse.error.errors })
    }

    try {
      const userId = user.id
      const { gpxData } = parse.data

      const result = await saveTerritoryData(userId, gpxData)

      return reply.send({
        success: true,
        message: 'Données de territoire sauvegardées'
      })

    } catch (error) {
      console.error('❌ Erreur dans la route /data:', error)
      return reply.status(500).send({
        error: 'Erreur lors de la sauvegarde des données',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  })
  // Route pour récupérer les données de territoire
  app.get('/data', async (request, reply) => {
    const user = await getAuthUser(request)
    if (!user) {
      return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
    }

    try {
      const userId = user.id
      const data = await getTerritoryData(userId)

      if (data.length === 0) {
        return reply.status(404).send({ error: 'Données de territoire non trouvées' })
      }

      return reply.send({
        success: true,
        data: data[0]
      })
    } catch (error) {
      console.error(error)
      return reply.status(500).send({
        error: 'Erreur lors de la récupération des données',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  })
  // Route pour récupérer les territoires reconstruits à partir du GPX
  app.get('/territories', async (request, reply) => {
    const user = await getAuthUser(request)
    if (!user) {
      return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
    }

    try {
      const userId = user.id
      const territories = await getReconstructedTerritories(userId)

      return reply.send({
        success: true,
        territories
      })

    } catch (error) {
      console.error(error)
      return reply.status(500).send({
        error: 'Erreur lors de la reconstruction des territoires',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  })

  // Route pour mettre à jour un territoire complet (images + layers)
  app.put('/territories/:territoryNumber/complete', async (request, reply) => {
    const user = await getAuthUser(request)
    if (!user) {
      return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
    }

    const parse = updateTerritoryCompleteSchema.safeParse(request.body)
    if (!parse.success) {
      return reply.status(400).send({ errors: parse.error.errors })
    }

    try {
      const { territory, images, layers } = parse.data
      const { territoryNumber } = request.params as { territoryNumber: string }
      const userId = user.id

      // Vérifier que le numéro de territoire correspond
      if (territory.num !== territoryNumber) {
        return reply.status(400).send({ error: 'Le numéro de territoire ne correspond pas' })
      }      // Créer le dossier utilisateur
      const userDir = path.join(__dirname, '../../public', userId);
      await fs.mkdir(userDir, { recursive: true });

      console.log(`🔄 Mise à jour complète du territoire ${territoryNumber} pour l'utilisateur ${userId}`)

      // 1. Sauvegarder les images (et supprimer les anciennes)
      const imagePromises: any[] = [];
      if (images.image) {
        imagePromises.push(
          (async () => {
            console.log(`📸 Sauvegarde de l'image standard pour le territoire ${territoryNumber}`)

            // Sauvegarder la nouvelle image (remplace automatiquement l'ancienne)
            const base64Data = images.image!.replace(/^data:image\/png;base64,/, '')
            const imageBuffer = Buffer.from(base64Data, 'base64')
            const standardFileName = getImageFileName(territoryNumber, 'standard')
            const filePath = path.join(userDir, standardFileName)

            await fs.writeFile(filePath, imageBuffer)

            await createTerritoryImage({
              userId,
              territoryNumber,
              imageType: 'standard',
              rotation: territory.rotation
            })
          })()
        )
      }
      if (images.large) {
        imagePromises.push(
          (async () => {
            console.log(`📸 Sauvegarde de l'image large pour le territoire ${territoryNumber}`)

            // Sauvegarder la nouvelle image (remplace automatiquement l'ancienne)
            const base64Data = images.large!.replace(/^data:image\/png;base64,/, '')
            const imageBuffer = Buffer.from(base64Data, 'base64')
            const largeFileName = getImageFileName(territoryNumber, 'large')
            const filePath = path.join(userDir, largeFileName)

            await fs.writeFile(filePath, imageBuffer)

            await createTerritoryImage({
              userId,
              territoryNumber,
              imageType: 'large',
              rotation: territory.rotation
            })
          })()
        )
      }

      if (images.miniature) {
        imagePromises.push((async () => {          console.log(`🖼️ Sauvegarde de la miniature pour le territoire ${territoryNumber}`)
          
          // Vérifier si c'est une URL ou des données base64
          const miniaturePrefix = images.miniature!.substring(0, 50)
          console.log(`🔍 Format de miniature détecté pour ${territoryNumber}:`, miniaturePrefix)

          // Si c'est une URL, on ignore la sauvegarde car l'image existe déjà
          if (images.miniature!.startsWith('http://') || images.miniature!.startsWith('https://')) {
            console.log(`⚠️ Miniature est une URL pour ${territoryNumber}, pas de sauvegarde nécessaire`)
            return
          }          // Sinon, traiter comme des données base64
          let base64Data: string

          if (images.miniature!.startsWith('data:image/png;base64,')) {
            base64Data = images.miniature!.replace(/^data:image\/png;base64,/, '')
            console.log(`✅ Format PNG détecté pour ${territoryNumber}`)
          } else if (images.miniature!.startsWith('data:image/webp;base64,')) {
            base64Data = images.miniature!.replace(/^data:image\/webp;base64,/, '')
            console.log(`✅ Format WebP détecté pour ${territoryNumber}`)
          } else if (images.miniature!.startsWith('data:image/jpeg;base64,')) {
            base64Data = images.miniature!.replace(/^data:image\/jpeg;base64,/, '')
            console.log(`✅ Format JPEG détecté pour ${territoryNumber}`)
          } else {
            // Assumer que c'est déjà du base64 sans en-tête
            base64Data = images.miniature!
            console.log(`⚠️ Format inconnu pour ${territoryNumber}, tentative de traitement direct`)
          } try {
            const imageBuffer = Buffer.from(base64Data, 'base64')
            console.log(`📊 Taille du buffer pour ${territoryNumber}: ${imageBuffer.length} bytes`)

            // Vérifier que le buffer n'est pas vide
            if (imageBuffer.length === 0) {
              throw new Error('Buffer d\'image vide')
            }

            // Vérifier les premiers bytes du buffer pour identifier le format
            const header = imageBuffer.subarray(0, 8)
            console.log(`🔍 En-tête du buffer pour ${territoryNumber}:`, Array.from(header).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '))              // Convertir en WebP avec sharp
            const webpBuffer = await sharp(imageBuffer)
              .webp({ quality: 80 })
              .toBuffer();

            console.log(`✅ Conversion WebP réussie pour ${territoryNumber}, taille: ${webpBuffer.length} bytes`);

            const miniatureFileName = getImageFileName(territoryNumber, 'miniature');
            const filePath = path.join(userDir, miniatureFileName);
            await fs.writeFile(filePath, webpBuffer);

            await createTerritoryImage({
              userId,
              territoryNumber,
              imageType: 'miniature'
            });

          } catch (error) {
            console.error(`❌ Erreur lors de la conversion de la miniature pour le territoire ${territoryNumber}:`, error)

            // Tentative de fallback : sauvegarder l'image sans conversion
            try {
              console.log(`🔄 Tentative de fallback pour ${territoryNumber} - sauvegarde sans conversion`)
              const imageBuffer = Buffer.from(base64Data, 'base64')
              const fallbackFileName = getImageFileName(territoryNumber, 'miniature')
              const fallbackPath = path.join(userDir, fallbackFileName)

              await fs.writeFile(fallbackPath, imageBuffer)

              await createTerritoryImage({
                userId,
                territoryNumber,
                imageType: 'miniature'
              })

              console.log(`✅ Fallback réussi pour ${territoryNumber} - miniature sauvegardée en PNG`)
            } catch (fallbackError) {
              console.error(`❌ Echec du fallback pour ${territoryNumber}:`, fallbackError)
              // Ne pas faire échouer toute l'opération pour une erreur de miniature
              console.warn(`⚠️ La miniature du territoire ${territoryNumber} n'a pas pu être sauvegardée`)
            }
          }
        })()
        )
      }

      // Attendre que toutes les images soient sauvegardées
      await Promise.all(imagePromises)      // 2. Sauvegarder les layers (et supprimer les anciens)
      const layerPromises = []

      if (layers.paintLayersImage && layers.paintLayersImage.length > 0) {
        layerPromises.push(
          (async () => {
            // Supprimer tous les anciens layers de ce territoire et type d'image
            await deleteTerritoryLayersByTerritory(userId, territoryNumber, 'standard')

            // Ajouter les nouveaux layers
            const paintLayers = layers.paintLayersImage!
            for (const layer of paintLayers) {
              await createTerritoryLayer({
                userId,
                territoryNumber,
                imageType: 'standard',
                layerType: layer.type,
                layerData: JSON.stringify(layer.data),
                style: JSON.stringify(layer.style),
                visible: layer.visible,
                locked: layer.locked
              })
            }
          })()
        )
        console.log(`🎨 Sauvegarde de ${layers.paintLayersImage.length} layers d'image standard`)
      }

      if (layers.paintLayersLarge && layers.paintLayersLarge.length > 0) {
        layerPromises.push(
          (async () => {
            // Supprimer tous les anciens layers de ce territoire et type d'image
            await deleteTerritoryLayersByTerritory(userId, territoryNumber, 'large')

            // Ajouter les nouveaux layers
            const paintLayers = layers.paintLayersLarge!
            for (const layer of paintLayers) {
              await createTerritoryLayer({
                userId,
                territoryNumber,
                imageType: 'large',
                layerType: layer.type,
                layerData: JSON.stringify(layer.data),
                style: JSON.stringify(layer.style),
                visible: layer.visible,
                locked: layer.locked
              })
            }
          })()
        )
        console.log(`🎨 Sauvegarde de ${layers.paintLayersLarge.length} layers d'image large`)
      }

      // Attendre que tous les layers soient sauvegardés
      await Promise.all(layerPromises)

      console.log(`✅ Territoire ${territoryNumber} mis à jour avec succès`)

      return reply.send({
        success: true,
        message: 'Territoire mis à jour avec succès'
      })
    }
    catch (error) {
      console.error('❌ Erreur lors de la mise à jour complète du territoire:', error)
      return reply.status(500).send({
        error: 'Erreur lors de la mise à jour du territoire',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  })

  // Route pour sauvegarder UNIQUEMENT les données standard d'un territoire
  app.put('/territories/:territoryNumber/standard', async (request, reply) => {
    const user = await getAuthUser(request)
    if (!user) {
      return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
    }

    const parse = updateTerritoryCompleteSchema.safeParse(request.body)
    if (!parse.success) {
      return reply.status(400).send({ errors: parse.error.errors })
    }

    try {
      const { territory, images, layers } = parse.data
      const { territoryNumber } = request.params as { territoryNumber: string }
      const userId = user.id

      console.log(`💾 Sauvegarde STANDARD UNIQUEMENT du territoire ${territoryNumber}`)

      // Créer le dossier utilisateur
      const userDir = path.join(__dirname, '../../public', userId);
      await fs.mkdir(userDir, { recursive: true });

      // Sauvegarder UNIQUEMENT l'image standard et la miniature
      const imagePromises: any[] = [];
      
      if (images.image) {
        imagePromises.push(
          (async () => {
            console.log(`📸 Sauvegarde de l'image STANDARD pour le territoire ${territoryNumber}`)
            const base64Data = images.image!.replace(/^data:image\/png;base64,/, '')
            const imageBuffer = Buffer.from(base64Data, 'base64')
            const standardFileName = getImageFileName(territoryNumber, 'standard')
            const filePath = path.join(userDir, standardFileName)
            await fs.writeFile(filePath, imageBuffer)
            await createTerritoryImage({
              userId,
              territoryNumber,
              imageType: 'standard',
              rotation: territory.rotation
            })
          })()
        )
      }

      if (images.miniature) {
        imagePromises.push((async () => {
          console.log(`🖼️ Sauvegarde de la MINIATURE pour le territoire ${territoryNumber}`)
          // ... logique de miniature identique à /complete
          let base64Data: string
          if (images.miniature!.startsWith('http://') || images.miniature!.startsWith('https://')) {
            console.log(`⚠️ Miniature est une URL pour ${territoryNumber}, pas de sauvegarde nécessaire`)
            return
          }
          if (images.miniature!.startsWith('data:image/png;base64,')) {
            base64Data = images.miniature!.replace(/^data:image\/png;base64,/, '')
          } else if (images.miniature!.startsWith('data:image/webp;base64,')) {
            base64Data = images.miniature!.replace(/^data:image\/webp;base64,/, '')
          } else if (images.miniature!.startsWith('data:image/jpeg;base64,')) {
            base64Data = images.miniature!.replace(/^data:image\/jpeg;base64,/, '')
          } else {
            base64Data = images.miniature!
          }
          try {
            const imageBuffer = Buffer.from(base64Data, 'base64')
            const webpBuffer = await sharp(imageBuffer).webp({ quality: 80 }).toBuffer();
            const miniatureFileName = getImageFileName(territoryNumber, 'miniature');
            const filePath = path.join(userDir, miniatureFileName);
            await fs.writeFile(filePath, webpBuffer);
            await createTerritoryImage({
              userId,
              territoryNumber,
              imageType: 'miniature'
            });
          } catch (error) {
            console.error(`❌ Erreur lors de la conversion de la miniature pour ${territoryNumber}:`, error)
          }
        })())
      }

      await Promise.all(imagePromises)

      // Sauvegarder UNIQUEMENT les layers standard
      if (layers.paintLayersImage) {
        await deleteTerritoryLayersByTerritory(userId, territoryNumber, 'standard')
        const paintLayers = layers.paintLayersImage
        for (const layer of paintLayers) {
          await createTerritoryLayer({
            userId,
            territoryNumber,
            imageType: 'standard',
            layerType: layer.type,
            layerData: JSON.stringify(layer.data),
            style: JSON.stringify(layer.style),
            visible: layer.visible,
            locked: layer.locked
          })
        }
        console.log(`🎨 Sauvegarde de ${layers.paintLayersImage.length} layers STANDARD`)
      }

      console.log(`✅ Territoire ${territoryNumber} (STANDARD) sauvegardé avec succès`)
      return reply.send({ success: true, message: 'Données standard sauvegardées' })
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde standard:', error)
      return reply.status(500).send({
        error: 'Erreur lors de la sauvegarde des données standard',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  })

  // Route pour sauvegarder UNIQUEMENT les données large d'un territoire  
  app.put('/territories/:territoryNumber/large', async (request, reply) => {
    const user = await getAuthUser(request)
    if (!user) {
      return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
    }

    const parse = updateTerritoryCompleteSchema.safeParse(request.body)
    if (!parse.success) {
      return reply.status(400).send({ errors: parse.error.errors })
    }

    try {
      const { territory, images, layers } = parse.data
      const { territoryNumber } = request.params as { territoryNumber: string }
      const userId = user.id

      console.log(`💾 Sauvegarde LARGE UNIQUEMENT du territoire ${territoryNumber}`)

      // Créer le dossier utilisateur
      const userDir = path.join(__dirname, '../../public', userId);
      await fs.mkdir(userDir, { recursive: true });

      // Sauvegarder UNIQUEMENT l'image large
      if (images.large) {
        console.log(`📸 Sauvegarde de l'image LARGE pour le territoire ${territoryNumber}`)
        const base64Data = images.large.replace(/^data:image\/png;base64,/, '')
        const imageBuffer = Buffer.from(base64Data, 'base64')
        const largeFileName = getImageFileName(territoryNumber, 'large')
        const filePath = path.join(userDir, largeFileName)
        await fs.writeFile(filePath, imageBuffer)
        await createTerritoryImage({
          userId,
          territoryNumber,
          imageType: 'large',
          rotation: territory.rotation
        })
      }

      // Sauvegarder UNIQUEMENT les layers large
      if (layers.paintLayersLarge) {
        await deleteTerritoryLayersByTerritory(userId, territoryNumber, 'large')
        const paintLayers = layers.paintLayersLarge
        for (const layer of paintLayers) {
          await createTerritoryLayer({
            userId,
            territoryNumber,
            imageType: 'large',
            layerType: layer.type,
            layerData: JSON.stringify(layer.data),
            style: JSON.stringify(layer.style),
            visible: layer.visible,
            locked: layer.locked
          })
        }
        console.log(`🎨 Sauvegarde de ${layers.paintLayersLarge.length} layers LARGE`)
      }

      console.log(`✅ Territoire ${territoryNumber} (LARGE) sauvegardé avec succès`)
      return reply.send({ success: true, message: 'Données large sauvegardées' })
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde large:', error)
      return reply.status(500).send({
        error: 'Erreur lors de la sauvegarde des données large',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  })

  // ...existing code...
}
