import { reconstructTerritoriesFromGpx } from '../utils/gpxParser.js'
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
  saveTerritoryLayers,
  deleteTerritoryLayersByTerritory,
  getImageFileName,
  getImageFilePath
} from '../db/territories/index.js'
import { getUserConfig } from '../db/userConfig/index.js'
import getAuthUser from '../lib/secure/auth.js'
import { promises as fs } from 'fs'
import { territoryNumberSchema, imageTypeSchema, getUserDirectory, resolveWithin, resolveImagePath } from '../lib/secure/imagePaths.js'
import { imageRoot } from '../lib/secure/storage.js'

// Schémas de validation
const coordSchema = z.object({
  lat: z.number(),
  lon: z.number()
})

const territorySchema = z.object({
  num: territoryNumberSchema,
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
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
    imageWidth: z.number().positive(),
    imageHeight: z.number().positive()
  }).refine(crop => crop.x + crop.width <= 1.000001 && crop.y + crop.height <= 1.000001, 'Recadrage hors de l’image').optional(),
  options: z.object({
    contourColor: z.string().optional(),
    contourWidth: z.number().optional()
  }).optional()
})

const saveTerritoryDataSchema = z.object({
  gpxData: z.string().refine(value => reconstructTerritoriesFromGpx(value).length > 0, 'GPX invalide ou vide')
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
  territoryNumber: territoryNumberSchema,
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

export const registerTerritoryRoutes = (app: FastifyInstance) => {
  app.addHook('preValidation', async (request, reply) => {
    const params = request.params as { territoryNumber?: string; imageType?: string } | undefined
    if (params?.territoryNumber !== undefined && !territoryNumberSchema.safeParse(params.territoryNumber).success
      || params?.imageType !== undefined && !imageTypeSchema.safeParse(params.imageType).success) {
      return reply.status(400).send({ error: 'Invalid image identifier' })
    }
  })
  // Route pour générer une image de territoire
  app.post('/generate-image', async (request, reply) => {
    const user = await getAuthUser(request)
    if (!user) {
      return reply.status(401).send({ success: false, error: 'api.error.auth.unauthorized' })
    }

    const parse = generateImageSchema.safeParse(request.body)
    if (!parse.success) {
      return reply.status(400).send({ success: false, errors: parse.error.issues })
    }

    try {
      const { territory, imageType, options = {} } = parse.data
      const userId = user.id

      // Validation des données d'entrée
      if (!territory || !territory.num) {
        return reply.status(400).send({
          success: false,
          error: 'Données de territoire invalides'
        })
      }

      console.log(`🚀 Génération d'image ${imageType} pour le territoire ${territory.num}`)

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
        const userDir = getUserDirectory(imageRoot, userId);
        await fs.mkdir(userDir, { recursive: true }); const base64Data = imageData.replace(/^data:image\/png;base64,/, '');

        // 1. Sauvegarder l'image ORIGINALE (copie de l'image générée)
        const originalFileName = getImageFileName(territory.num, 'original');
        const originalFilePath = resolveWithin(userDir, originalFileName);
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
        const standardFilePath = resolveWithin(userDir, standardFileName);
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

          const thumbnailPath = resolveWithin(userDir, thumbnailFileName);
          await fs.writeFile(thumbnailPath, webpBuffer);          // Sauvegarder les métadonnées de la miniature
          await createTerritoryImage({
            userId,
            territoryNumber: territory.num,
            imageType: 'miniature',
            width: userConfig.thumbnailWidth,
            height: Math.round(dimensions.finalHeight / dimensions.finalWidth * userConfig.thumbnailWidth)
          });
        }

        await deleteTerritoryLayersByTerritory(userId, territory.num, 'standard');
        return reply.send({ success: true });
      } else if (imageType === 'large') {
        const imageResult = await imageService.generateLargeImage(territory, options);
        imageData = imageResult.dataUrl;

        // Créer le dossier utilisateur
        const userDir = getUserDirectory(imageRoot, userId);
        await fs.mkdir(userDir, { recursive: true }); const base64Data = imageData.replace(/^data:image\/png;base64,/, '');

        // 1. Sauvegarder l'image ORIGINALE LARGE (copie de l'image générée)
        const originalLargeFileName = getImageFileName(territory.num, 'originalLarge');
        const originalLargeFilePath = resolveWithin(userDir, originalLargeFileName);
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
        const largeFilePath = resolveWithin(userDir, largeFileName);
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
            break;
          } catch (error) {
            retries++;
            if (retries >= maxRetries) {
              throw new Error(`Fichiers large non créés après ${maxRetries} tentatives`);
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
        await deleteTerritoryLayersByTerritory(userId, territory.num, 'large');
        return reply.send({ success: true });
      } else {
        return reply.status(400).send({ success: false, error: 'Type d\'image non supporté' })
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la génération pour le territoire ${parse.data?.territory?.num}:`, error)
      return reply.status(500).send({
        success: false,
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
      return reply.status(400).send({ errors: parse.error.issues })
    }    try {      const { territory, customBbox, cropData, options = {} } = parse.data
      const userId = user.id
      let finalBbox = customBbox

      if (cropData) {
        // Récupérer l'image originalLarge existante pour connaître son bbox
        const existingImage = await getTerritoryImage(userId, territory.num, 'originalLarge')

        if (!existingImage[0]?.bbox) return reply.status(409).send({ error: 'Régénérez le plan large avant de le recadrer : ses coordonnées sont manquantes.' })
        if (existingImage[0].bbox) {
          const currentBbox = JSON.parse(existingImage[0].bbox) as [number, number, number, number]

          const [minLon, minLat, maxLon, maxLat] = currentBbox
          const bboxWidth = maxLon - minLon
          const bboxHeight = maxLat - minLat

          // Calculer le nouveau bbox basé sur les coordonnées de crop
          // Les coordonnées de crop sont normalisées (0-1) par rapport à l'image affichée
          const newMinLon = minLon + (cropData.x * bboxWidth)
          const newMaxLon = minLon + ((cropData.x + cropData.width) * bboxWidth)

          // Pour les coordonnées Y, attention à l'inversion :
          // Dans l'image : Y=0 en haut, Y=1 en bas
          // Dans les coordonnées géo : minLat=bas, maxLat=haut
          const newMaxLat = maxLat - (cropData.y * bboxHeight)
          const newMinLat = maxLat - ((cropData.y + cropData.height) * bboxHeight)

          finalBbox = [newMinLon, newMinLat, newMaxLon, newMaxLat]
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
        ignApiRateLimit: userConfig.ignApiRateLimit,        ...options // Les options passées en paramètre prennent le dessus
      }

      const imageService = new TerritoryImageService(
        serviceConfig,        dimensions, // Les dimensions originales - l'optimisation se fait dans le service
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
      const userDir = getUserDirectory(imageRoot, userId)
      await fs.mkdir(userDir, { recursive: true });

      const base64Data = croppedImageResult.dataUrl.replace(/^data:image\/png;base64,/, '')

      // 1. Sauvegarder l'image ORIGINALE LARGE (copie de l'image générée avec crop)
      const originalLargeFileName = getImageFileName(territory.num, 'originalLarge');
      const originalLargeFilePath = resolveWithin(userDir, originalLargeFileName);
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
      const largeFilePath = resolveWithin(userDir, largeFileName);
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
          break;
        } catch (error) {
          retries++;
          if (retries >= maxRetries) {
            throw new Error(`Fichiers non créés après ${maxRetries} tentatives`);
          }
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }

      await deleteTerritoryLayersByTerritory(userId, territory.num, 'large');
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
      const { territoryNumber, imageType } = request.query as { territoryNumber?: string, imageType?: string }

      const images = await getTerritoryImagesByUser(userId, territoryNumber, imageType);

      return reply.send({
        success: true,
        images: images.map(img => ({
          ...img,
          imageUrl: `/p${getImageFilePath(userId, img.territoryNumber, img.imageType)}`
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
        const filePath = resolveImagePath(imageRoot, userId, territoryNumber, imageType);
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
      console.error('❌ Erreur de validation:', parse.error.issues)
      return reply.status(400).send({ errors: parse.error.issues })
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
      return reply.status(400).send({ errors: parse.error.issues })
    }

    try {
      const { territory, images, layers } = parse.data
      const { territoryNumber } = request.params as { territoryNumber: string }
      const userId = user.id

      // Vérifier que le numéro de territoire correspond
      if (territory.num !== territoryNumber) {
        return reply.status(400).send({ error: 'Le numéro de territoire ne correspond pas' })
      }      // Créer le dossier utilisateur
      const userDir = getUserDirectory(imageRoot, userId);
      await fs.mkdir(userDir, { recursive: true });

      // 1. Sauvegarder les images (et supprimer les anciennes)
      const imagePromises: any[] = [];
      if (images.image) {
        imagePromises.push(
          (async () => {

            // Sauvegarder la nouvelle image (remplace automatiquement l'ancienne)
            const base64Data = images.image!.replace(/^data:image\/png;base64,/, '')
            const imageBuffer = Buffer.from(base64Data, 'base64')
            const standardFileName = getImageFileName(territoryNumber, 'standard')
            const filePath = resolveWithin(userDir, standardFileName)

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

            // Sauvegarder la nouvelle image (remplace automatiquement l'ancienne)
            const base64Data = images.large!.replace(/^data:image\/png;base64,/, '')
            const imageBuffer = Buffer.from(base64Data, 'base64')
            const largeFileName = getImageFileName(territoryNumber, 'large')
            const filePath = resolveWithin(userDir, largeFileName)

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
        imagePromises.push((async () => {
          // Si c'est une URL, on ignore la sauvegarde car l'image existe déjà
          if (images.miniature!.startsWith('http://') || images.miniature!.startsWith('https://')) {
            return
          }          // Sinon, traiter comme des données base64
          let base64Data: string

          if (images.miniature!.startsWith('data:image/png;base64,')) {
            base64Data = images.miniature!.replace(/^data:image\/png;base64,/, '')
          } else if (images.miniature!.startsWith('data:image/webp;base64,')) {
            base64Data = images.miniature!.replace(/^data:image\/webp;base64,/, '')
          } else if (images.miniature!.startsWith('data:image/jpeg;base64,')) {
            base64Data = images.miniature!.replace(/^data:image\/jpeg;base64,/, '')
          } else {
            // Assumer que c'est déjà du base64 sans en-tête
            base64Data = images.miniature!
          } try {
            const imageBuffer = Buffer.from(base64Data, 'base64')

            // Vérifier que le buffer n'est pas vide
            if (imageBuffer.length === 0) {
              throw new Error('Buffer d\'image vide')
            }

            const webpBuffer = await sharp(imageBuffer)
              .webp({ quality: 80 })
              .toBuffer();

            const miniatureFileName = getImageFileName(territoryNumber, 'miniature');
            const filePath = resolveWithin(userDir, miniatureFileName);
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
              const imageBuffer = Buffer.from(base64Data, 'base64')
              const fallbackFileName = getImageFileName(territoryNumber, 'miniature')
              const fallbackPath = resolveWithin(userDir, fallbackFileName)

              await fs.writeFile(fallbackPath, imageBuffer)

              await createTerritoryImage({
                userId,
                territoryNumber,
                imageType: 'miniature'
              })

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
      if (layers.paintLayersImage) await saveTerritoryLayers(userId, territoryNumber, 'standard', layers.paintLayersImage)
      if (layers.paintLayersLarge) await saveTerritoryLayers(userId, territoryNumber, 'large', layers.paintLayersLarge)

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
      return reply.status(400).send({ errors: parse.error.issues })
    }

    try {
      const { territory, images, layers } = parse.data
      const { territoryNumber } = request.params as { territoryNumber: string }
      const userId = user.id

      // Créer le dossier utilisateur
      const userDir = getUserDirectory(imageRoot, userId);
      await fs.mkdir(userDir, { recursive: true });

      // Sauvegarder UNIQUEMENT l'image standard et la miniature
      const imagePromises: any[] = [];

      if (images.image) {
        imagePromises.push(
          (async () => {
            const base64Data = images.image!.replace(/^data:image\/png;base64,/, '')
            const imageBuffer = Buffer.from(base64Data, 'base64')
            const standardFileName = getImageFileName(territoryNumber, 'standard')
            const filePath = resolveWithin(userDir, standardFileName)
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
          // ... logique de miniature identique à /complete
          let base64Data: string
          if (images.miniature!.startsWith('http://') || images.miniature!.startsWith('https://')) {
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
            const filePath = resolveWithin(userDir, miniatureFileName);
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
      if (layers.paintLayersImage) await saveTerritoryLayers(userId, territoryNumber, 'standard', layers.paintLayersImage)

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
      return reply.status(400).send({ errors: parse.error.issues })
    }

    try {
      const { territory, images, layers } = parse.data
      const { territoryNumber } = request.params as { territoryNumber: string }
      const userId = user.id

      // Créer le dossier utilisateur
      const userDir = getUserDirectory(imageRoot, userId);
      await fs.mkdir(userDir, { recursive: true });

      // Sauvegarder UNIQUEMENT l'image large
      if (images.large) {
        const base64Data = images.large.replace(/^data:image\/png;base64,/, '')
        const imageBuffer = Buffer.from(base64Data, 'base64')
        const largeFileName = getImageFileName(territoryNumber, 'large')
        const filePath = resolveWithin(userDir, largeFileName)
        await fs.writeFile(filePath, imageBuffer)
        await createTerritoryImage({
          userId,
          territoryNumber,
          imageType: 'large',
          rotation: territory.rotation
        })
      }

      // Sauvegarder UNIQUEMENT les layers large
      if (layers.paintLayersLarge) await saveTerritoryLayers(userId, territoryNumber, 'large', layers.paintLayersLarge)

      return reply.send({ success: true, message: 'Données large sauvegardées' })
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde large:', error)
      return reply.status(500).send({
        error: 'Erreur lors de la sauvegarde des données large',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  })
}
