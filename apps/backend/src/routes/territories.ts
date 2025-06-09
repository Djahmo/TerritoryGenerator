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
  deleteModifiedTerritoryImages,
  saveTerritoryData,
  getTerritoryData,
  getReconstructedTerritories,
  createTerritoryLayer,
  getTerritoryLayersByUser,
  getTerritoryLayer,
  updateTerritoryLayer,
  deleteTerritoryLayer,
  deleteTerritoryLayersByTerritory
} from '../db/territories/index.js'
import { getUserConfig } from '../db/userConfig/index.js'
import getAuthUser from '../lib/secure/auth.js'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parseCsv, makeGpx } from '../utils/csvParser.js'

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
    }

    try {
      const { territory, imageType, options = {} } = parse.data
      const userId = user.id

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
        ignApiCRS: userConfig.ignApiCRS,        networkRetries: userConfig.networkRetries,
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
      let fileName: string
      let result: any

      if (imageType === 'standard') {
        // Supprimer les anciennes images standard ET originales pour ce territoire
        const oldStandardPaths = await deleteTerritoryImage(userId, territory.num, 'standard');
        const oldOriginalPaths = await deleteTerritoryImage(userId, territory.num, 'original');
        const oldMiniaturePaths = await deleteTerritoryImage(userId, territory.num, 'miniature');

        // Supprimer les fichiers physiques
        for (const imagePath of [...oldStandardPaths, ...oldOriginalPaths, ...oldMiniaturePaths]) {
          await deleteFileIfExists(imagePath);
        }

        result = await imageService.generateStandardImage(territory, options);
        imageData = result.image;

        // Créer le dossier utilisateur
        const userDir = path.join(__dirname, '../../public', userId);
        await fs.mkdir(userDir, { recursive: true });

        const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // 1. Sauvegarder l'image ORIGINALE (copie de l'image générée)
        const originalId = nanoid();
        const originalFileName = `${originalId}.png`;
        const originalFilePath = path.join(userDir, originalFileName);
        await fs.writeFile(originalFilePath, imageBuffer);

        await createTerritoryImage({
          userId,
          territoryNumber: territory.num,
          imageType: 'original',
          fileName: originalFileName,
          filePath: `/${userId}/${originalFileName}`,
          fileSize: imageBuffer.length,
          width: dimensions.finalWidth,
          height: dimensions.finalHeight,
          rotation: territory.rotation
        });

        // 2. Sauvegarder l'image STANDARD (identique à l'originale pour le moment)
        const standardId = nanoid();
        const standardFileName = `${standardId}.png`;
        const standardFilePath = path.join(userDir, standardFileName);
        await fs.writeFile(standardFilePath, imageBuffer);

        await createTerritoryImage({
          userId,
          territoryNumber: territory.num,
          imageType: 'standard',
          fileName: standardFileName,
          filePath: `/${userId}/${standardFileName}`,
          fileSize: imageBuffer.length,
          width: dimensions.finalWidth,
          height: dimensions.finalHeight,
          rotation: territory.rotation
        });

        // 3. Créer et sauvegarder la MINIATURE
        if (result.miniature) {
          const thumbnailId = nanoid();
          const thumbnailFileName = `${thumbnailId}.webp`;

          // Convertir la miniature PNG en WebP avec sharp
          const thumbnailBase64 = result.miniature.replace(/^data:image\/png;base64,/, '');
          const thumbnailBuffer = Buffer.from(thumbnailBase64, 'base64');

          // Convertir en WebP avec sharp
          const webpBuffer = await sharp(thumbnailBuffer)
            .webp({ quality: 80 })
            .toBuffer();

          const thumbnailPath = path.join(userDir, thumbnailFileName);
          await fs.writeFile(thumbnailPath, webpBuffer);

          // Sauvegarder les métadonnées de la miniature
          await createTerritoryImage({
            userId,
            territoryNumber: territory.num,
            imageType: 'miniature',
            fileName: thumbnailFileName,
            filePath: `/${userId}/${thumbnailFileName}`,
            fileSize: webpBuffer.length,
            width: userConfig.thumbnailWidth,
            height: Math.round(dimensions.finalHeight / dimensions.finalWidth * userConfig.thumbnailWidth)
          });
        }

        return reply.send({ success: true });
      } else if (imageType === 'large') {
        // Supprimer les anciennes images large ET originalLarge pour ce territoire
        const oldLargePaths = await deleteTerritoryImage(userId, territory.num, 'large');
        const oldOriginalLargePaths = await deleteTerritoryImage(userId, territory.num, 'originalLarge');

        // Supprimer les fichiers physiques
        for (const imagePath of [...oldLargePaths, ...oldOriginalLargePaths]) {
          await deleteFileIfExists(imagePath);
        }

        const imageResult = await imageService.generateLargeImage(territory, options);
        imageData = imageResult.dataUrl;

        // Créer le dossier utilisateur
        const userDir = path.join(__dirname, '../../public', userId);
        await fs.mkdir(userDir, { recursive: true });

        const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // 1. Sauvegarder l'image ORIGINALE LARGE (copie de l'image générée)
        const originalLargeId = nanoid();
        const originalLargeFileName = `${originalLargeId}.png`;
        const originalLargeFilePath = path.join(userDir, originalLargeFileName);
        await fs.writeFile(originalLargeFilePath, imageBuffer);

        await createTerritoryImage({
          userId,
          territoryNumber: territory.num,
          imageType: 'originalLarge',
          fileName: originalLargeFileName,
          filePath: `/${userId}/${originalLargeFileName}`,
          fileSize: imageBuffer.length,
          width: imageResult.width,
          height: imageResult.height,
          rotation: territory.rotation
        });

        // 2. Sauvegarder l'image LARGE (identique à l'originale pour le moment)
        const largeId = nanoid();
        const largeFileName = `${largeId}.png`;
        const largeFilePath = path.join(userDir, largeFileName);
        await fs.writeFile(largeFilePath, imageBuffer);

        await createTerritoryImage({
          userId,
          territoryNumber: territory.num,
          imageType: 'large',
          fileName: largeFileName,
          filePath: `/${userId}/${largeFileName}`,
          fileSize: imageBuffer.length,
          width: imageResult.width,
          height: imageResult.height,
          rotation: territory.rotation
        });

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
    }

    try {
      const { territory, customBbox, cropData, options = {} } = parse.data
      const userId = user.id

      // Supprimer les anciennes images large pour ce territoire
      const oldImagePaths = await deleteTerritoryImage(userId, territory.num, 'large');

      // Supprimer les fichiers physiques
      for (const imagePath of oldImagePaths) {
        await deleteFileIfExists(imagePath);
      }

      // Récupérer la configuration utilisateur de la base de données
      const userConfig = await getUserConfig(userId)

      // Créer le service de génération d'images avec la config utilisateur
      const serviceConfig = {
        ppp: userConfig.ppp,
        largeFactor: parseFloat(userConfig.largeFactor)
      }      // Calculer les dimensions basées sur la configuration utilisateur
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

      const croppedImageResult = await imageService.generateLargeImageWithCustomBbox(
        territory,
        customBbox,
        options,
        cropData
      )

      // Créer le dossier utilisateur
      const userDir = path.join(__dirname, '../../public', userId)
      await fs.mkdir(userDir, { recursive: true })

      const imageId = nanoid()
      const fileName = `${imageId}.png`
      const base64Data = croppedImageResult.dataUrl.replace(/^data:image\/png;base64,/, '')
      const imageBuffer = Buffer.from(base64Data, 'base64')
      const filePath = path.join(userDir, fileName)

      await fs.writeFile(filePath, imageBuffer)

      // Sauvegarder les métadonnées en base
      const imageRecord = await createTerritoryImage({
        userId,
        territoryNumber: territory.num,
        imageType: 'large',
        fileName,
        filePath: `/${userId}/${fileName}`,
        fileSize: imageBuffer.length,
        width: croppedImageResult.width,
        height: croppedImageResult.height,
        bbox: JSON.stringify(customBbox),
        cropData: cropData ? JSON.stringify(cropData) : undefined
      })

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

      const images = await getTerritoryImagesByUser(userId, territoryNumber, imageType)

      return reply.send({
        success: true,
        images: images.map(img => ({
          ...img,
          imageUrl: img.filePath
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
      const { territoryNumber, imageType } = request.params as { territoryNumber: string, imageType: string }

      // Récupérer l'image avant suppression pour supprimer le fichier
      const image = await getTerritoryImage(userId, territoryNumber, imageType)

      if (image.length > 0) {
        const filePath = path.join(__dirname, '../../public', image[0].filePath)
        try {
          await fs.unlink(filePath)
        } catch (err) {
          // Ignorer les erreurs de suppression de fichier
          console.warn(`Impossible de supprimer le fichier: ${filePath}`)
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
    }  })

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
      const imagePromises = [];

      if (images.image) {
        imagePromises.push(
          (async () => {
            console.log(`📸 Sauvegarde de l'image standard pour le territoire ${territoryNumber}`)
            // Supprimer uniquement les anciennes images standard modifiées (pas les originales)
            const oldImagePaths = await deleteModifiedTerritoryImages(userId, territoryNumber, 'standard')
            for (const imagePath of oldImagePaths) {
              const fullPath = path.join(process.cwd(), 'public', imagePath)
              await deleteFileIfExists(fullPath)
              console.log(`Fichier supprimé: ${fullPath}`)
            }

            // Sauvegarder la nouvelle image
            const imageId = nanoid()
            const fileName = `${imageId}.png`
            const base64Data = images.image!.replace(/^data:image\/png;base64,/, '')
            const imageBuffer = Buffer.from(base64Data, 'base64')
            const filePath = path.join(userDir, fileName)

            await fs.writeFile(filePath, imageBuffer)

            await createTerritoryImage({
              userId,
              territoryNumber,
              imageType: 'standard',
              fileName,
              filePath: `/${userId}/${fileName}`,
              fileSize: imageBuffer.length,
              rotation: territory.rotation
            })
          })()
        )
      }      if (images.large) {
        imagePromises.push(
          (async () => {
            console.log(`📸 Sauvegarde de l'image large pour le territoire ${territoryNumber}`)
            // Supprimer uniquement les anciennes images large modifiées (pas les originales)
            const oldImagePaths = await deleteModifiedTerritoryImages(userId, territoryNumber, 'large')
            for (const imagePath of oldImagePaths) {
              const fullPath = path.join(process.cwd(), 'public', imagePath)
              await deleteFileIfExists(fullPath)
              console.log(`Fichier supprimé: ${fullPath}`)
            }

            // Sauvegarder la nouvelle image
            const imageId = nanoid()
            const fileName = `${imageId}.png`
            const base64Data = images.large!.replace(/^data:image\/png;base64,/, '')
            const imageBuffer = Buffer.from(base64Data, 'base64')
            const filePath = path.join(userDir, fileName)

            await fs.writeFile(filePath, imageBuffer)

            await createTerritoryImage({
              userId,
              territoryNumber,
              imageType: 'large',
              fileName,
              filePath: `/${userId}/${fileName}`,
              fileSize: imageBuffer.length,
              rotation: territory.rotation
            })
          })()
        )
      }

      if (images.miniature) {
        imagePromises.push(          (async () => {
            console.log(`🖼️ Sauvegarde de la miniature pour le territoire ${territoryNumber}`)
            // Supprimer uniquement les anciennes miniatures modifiées (pas les originales)
            const oldImagePaths = await deleteModifiedTerritoryImages(userId, territoryNumber, 'miniature')
            for (const imagePath of oldImagePaths) {
              const fullPath = path.join(process.cwd(), 'public', imagePath)
              await deleteFileIfExists(fullPath)
              console.log(`Fichier supprimé: ${fullPath}`)
            }

            // Sauvegarder la nouvelle miniature
            const imageId = nanoid()
            const fileName = `${imageId}.webp`

            // Convertir la miniature PNG en WebP avec sharp
            const base64Data = images.miniature!.replace(/^data:image\/png;base64,/, '')
            const imageBuffer = Buffer.from(base64Data, 'base64')

            // Convertir en WebP avec sharp
            const webpBuffer = await sharp(imageBuffer)
              .webp({ quality: 80 })
              .toBuffer()

            const filePath = path.join(userDir, fileName)
            await fs.writeFile(filePath, webpBuffer)

            await createTerritoryImage({
              userId,
              territoryNumber,
              imageType: 'miniature',
              fileName,
              filePath: `/${userId}/${fileName}`,
              fileSize: webpBuffer.length
            })
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
      })    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour complète du territoire:', error)
      return reply.status(500).send({
        error: 'Erreur lors de la mise à jour du territoire',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  })

  // ROUTES POUR LES LAYERS DE TERRITOIRE

  // Récupérer tous les layers d'un territoire
  app.get('/territories/:territoryNumber/layers', async (request, reply) => {
    const { territoryNumber } = request.params as { territoryNumber: string }
    const { imageType } = request.query as { imageType?: string }
    const user = await getAuthUser(request)
    if (!user) {
      return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
    }
    const userId = user.id

    try {
      const layers = await getTerritoryLayersByUser(userId, territoryNumber, imageType)
      return reply.send({
        success: true,
        data: layers
      })
    } catch (error) {
      console.error('Erreur lors de la récupération des layers:', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des layers'
      })
    }
  })

  // Créer un nouveau layer
  app.post('/territories/:territoryNumber/layers', async (request, reply) => {
    const { territoryNumber } = request.params as { territoryNumber: string }
    const user = await getAuthUser(request)
    if (!user) {
      return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
    }

    const parse = layerSchema.safeParse(request.body)
    if (!parse.success) {
      return reply.status(400).send({ errors: parse.error.errors })
    }

    const userId = user.id
    const {
      imageType,
      layerType,
      layerData,
      style,
      visible,
      locked
    } = parse.data

    try {
      const layer = await createTerritoryLayer({
        userId,
        territoryNumber,
        imageType,
        layerType,
        layerData,
        style,
        visible,
        locked
      })

      return reply.status(201).send({
        success: true,
        data: layer
      })
    } catch (error) {
      console.error('Erreur lors de la création du layer:', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la création du layer'
      })
    }
  })

  // Récupérer un layer spécifique
  app.get('/territories/layers/:layerId', async (request, reply) => {
    const { layerId } = request.params as { layerId: string }
    const user = await getAuthUser(request)
    if (!user) {
      return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
    }
    const userId = user.id

    try {
      const layer = await getTerritoryLayer(userId, layerId)

      if (!layer) {
        return reply.status(404).send({
          success: false,
          message: 'Layer non trouvé'
        })
      }

      return reply.send({
        success: true,
        data: layer
      })
    } catch (error) {
      console.error('Erreur lors de la récupération du layer:', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération du layer'
      })
    }
  })

  // Mettre à jour un layer
  app.patch('/territories/layers/:layerId', async (request, reply) => {
    const { layerId } = request.params as { layerId: string }
    const user = await getAuthUser(request)
    if (!user) {
      return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
    }

    const parse = updateLayerSchema.safeParse(request.body)
    if (!parse.success) {
      return reply.status(400).send({ errors: parse.error.errors })
    }

    const userId = user.id
    const updates = parse.data

    try {
      const success = await updateTerritoryLayer(userId, layerId, updates)

      if (!success) {
        return reply.status(404).send({
          success: false,
          message: 'Layer non trouvé ou non modifié'
        })
      }

      return reply.send({
        success: true,
        message: 'Layer mis à jour avec succès'
      })
    } catch (error) {
      console.error('Erreur lors de la mise à jour du layer:', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la mise à jour du layer'
      })
    }
  })

  // Supprimer un layer
  app.delete('/territories/layers/:layerId', async (request, reply) => {
    const { layerId } = request.params as { layerId: string }
    const user = await getAuthUser(request)
    if (!user) {
      return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
    }
    const userId = user.id

    try {
      const success = await deleteTerritoryLayer(userId, layerId)

      if (!success) {
        return reply.status(404).send({
          success: false,
          message: 'Layer non trouvé ou non supprimé'
        })
      }

      return reply.send({
        success: true,
        message: 'Layer supprimé avec succès'
      })
    } catch (error) {
      console.error('Erreur lors de la suppression du layer:', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la suppression du layer'
      })
    }
  })

  // Supprimer tous les layers d'un territoire
  app.delete('/territories/:territoryNumber/layers', async (request, reply) => {
    const { territoryNumber } = request.params as { territoryNumber: string }
    const { imageType } = request.query as { imageType?: string }
    const user = await getAuthUser(request)
    if (!user) {
      return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
    }
    const userId = user.id

    try {
      const count = await deleteTerritoryLayersByTerritory(userId, territoryNumber, imageType)

      return reply.send({
        success: true,
        message: `${count} layers supprimés avec succès`
      })
    } catch (error) {
      console.error('Erreur lors de la suppression des layers:', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la suppression des layers'
      })
    }
  })

  /**
   * Supprime un fichier du système de fichiers
   */
  const deleteFileIfExists = async (filePath: string) => {
    const fullPath = path.join(__dirname, '../../public', filePath.replace(/^\//, ''));
    try {
      await fs.access(fullPath);
      await fs.unlink(fullPath);
      console.log(`Fichier supprimé: ${fullPath}`);
    } catch (error) {
      // Le fichier n'existe peut-être pas, ignorer l'erreur
      console.log(`Fichier non trouvé ou erreur lors de la suppression: ${fullPath}`);
    }
  }
}
