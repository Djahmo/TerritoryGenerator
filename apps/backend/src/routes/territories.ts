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
  getReconstructedTerritories
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

export const registerTerritoryRoutes = (app: FastifyInstance) => {
  // Route pour générer une image de territoire
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

        const widthPx = Math.round(widthCm * p)
        const heightPx = Math.round(heightCm * p)
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
      let fileName: string
      let result: any

      if (imageType === 'standard') {
        // Supprimer les anciennes images standard pour ce territoire
        const oldImagePaths = await deleteTerritoryImage(userId, territory.num, 'standard');
        
        // Supprimer les fichiers physiques
        for (const imagePath of oldImagePaths) {
          await deleteFileIfExists(imagePath);
        }
        
        result = await imageService.generateStandardImage(territory, options);
        imageData = result.image;
        fileName = `${imageId}.png`;
        
        // Créer le dossier utilisateur
        const userDir = path.join(__dirname, '../../public', userId);
        await fs.mkdir(userDir, { recursive: true });

        const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const filePath = path.join(userDir, fileName);

        await fs.writeFile(filePath, imageBuffer);

        // Sauvegarder l'image standard (image et original sont les mêmes au début)
        await createTerritoryImage({
          userId,
          territoryNumber: territory.num,
          imageType: 'standard', // Pour le moment, on utilise standard pour les deux
          fileName,
          filePath: `/${userId}/${fileName}`,
          fileSize: imageBuffer.length,
          width: dimensions.finalWidth,
          height: dimensions.finalHeight,
          rotation: territory.rotation
        });
        
        // Supprimer les anciennes miniatures
        const oldMiniaturePaths = await deleteTerritoryImage(userId, territory.num, 'miniature');
        
        // Supprimer les fichiers physiques des miniatures
        for (const miniaturePath of oldMiniaturePaths) {
          await deleteFileIfExists(miniaturePath);
        }
        
        // Créer la miniature
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
        // Supprimer les anciennes images large pour ce territoire
        const oldLargeImagePaths = await deleteTerritoryImage(userId, territory.num, 'large');
        
        // Supprimer les fichiers physiques
        for (const imagePath of oldLargeImagePaths) {
          await deleteFileIfExists(imagePath);
        }
        
        const imageResult = await imageService.generateLargeImage(territory, options);
        imageData = imageResult.dataUrl;
        fileName = `${imageId}.png`;

        // Créer le dossier utilisateur
        const userDir = path.join(__dirname, '../../public', userId);
        await fs.mkdir(userDir, { recursive: true });

        const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const filePath = path.join(userDir, fileName);

        await fs.writeFile(filePath, imageBuffer);

        // Sauvegarder l'image large (large et originalLarge sont les mêmes au début)
        await createTerritoryImage({
          userId,
          territoryNumber: territory.num,
          imageType: 'large',
          fileName,
          filePath: `/${userId}/${fileName}`,
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

        const widthPx = Math.round(widthCm * p)
        const heightPx = Math.round(heightCm * p)
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
