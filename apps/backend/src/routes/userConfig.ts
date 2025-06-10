import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getUserConfig, updateUserConfig, resetUserConfig } from '../db/index.js'
import getAuthUser from '../lib/secure/auth.js'

// Schéma de validation pour la mise à jour de la configuration
const updateConfigSchema = z.object({
  // Configuration du canvas/papier
  ppp: z.number().min(100).max(300).optional(),
  ratioX: z.number().min(0.1).max(10).optional(),
  ratioY: z.number().min(0.1).max(10).optional(),
  largeRatioX: z.number().min(0.1).max(10).optional(),
  largeRatioY: z.number().min(0.1).max(10).optional(),
  largeFactor: z.number().min(0.01).max(1).optional(),

  // Configuration de génération d'images
  contourColor: z.string().optional(),
  contourWidth: z.number().min(1).max(50).optional(),
  thumbnailWidth: z.number().min(100).max(1000).optional(),
  palette: z.array(z.string()).optional(),

  // Configuration réseau
  networkRetries: z.number().min(1).max(10).optional(),
  networkDelay: z.number().min(100).max(10000).optional(),
  ignApiRateLimit: z.number().min(10).max(1000).optional(),

  // Configuration API IGN
  ignApiBaseUrl: z.string().url().optional(),
  ignApiLayer: z.string().optional(),
  ignApiFormat: z.string().optional(),
  ignApiCRS: z.string().optional()
})

export const registerUserConfigRoutes = (app: FastifyInstance) => {
  // Route pour récupérer la configuration de l'utilisateur
  app.get('/user-config', async (request, reply) => {
    const user = await getAuthUser(request)
    if (!user) {
      return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
    }

    try {
      const config = await getUserConfig(user.id)

      // Convertir les champs numériques string en nombres et parser la palette
      const processedConfig = {
        ...config,
        ratioX: parseFloat(config.ratioX),
        ratioY: parseFloat(config.ratioY),
        largeRatioX: parseFloat(config.largeRatioX),
        largeRatioY: parseFloat(config.largeRatioY),
        largeFactor: parseFloat(config.largeFactor),
        palette: JSON.parse(config.palette)
      }

      return reply.send({
        success: true,
        config: processedConfig
      })
    } catch (error) {
      console.error(error)
      return reply.status(500).send({
        error: 'Erreur lors de la récupération de la configuration',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  })

  // Route pour mettre à jour la configuration de l'utilisateur
  app.put('/user-config', async (request, reply) => {
    const user = await getAuthUser(request)
    if (!user) {
      return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
    }

    const parse = updateConfigSchema.safeParse(request.body)
    if (!parse.success) {
      return reply.status(400).send({ errors: parse.error.errors })
    }

    try {
      const updates: any = { ...parse.data }

      if (updates.ratioX !== undefined) updates.ratioX = updates.ratioX.toString()
      if (updates.ratioY !== undefined) updates.ratioY = updates.ratioY.toString()
      if (updates.largeRatioX !== undefined) updates.largeRatioX = updates.largeRatioX.toString()
      if (updates.largeRatioY !== undefined) updates.largeRatioY = updates.largeRatioY.toString()
      if (updates.largeFactor !== undefined) updates.largeFactor = updates.largeFactor.toString()

      // Sérialiser la palette
      if (updates.palette !== undefined) {
        updates.palette = JSON.stringify(updates.palette)
      }

      const updatedConfig = await updateUserConfig(user.id, updates)

      // Convertir les champs pour la réponse
      const processedConfig = {
        ...updatedConfig,
        ratioX: parseFloat(updatedConfig.ratioX),
        ratioY: parseFloat(updatedConfig.ratioY),
        largeRatioX: parseFloat(updatedConfig.largeRatioX),
        largeRatioY: parseFloat(updatedConfig.largeRatioY),
        largeFactor: parseFloat(updatedConfig.largeFactor),
        palette: JSON.parse(updatedConfig.palette)
      }

      return reply.send({
        success: true,
        config: processedConfig
      })
    } catch (error) {
      console.error(error)
      return reply.status(500).send({
        error: 'Erreur lors de la mise à jour de la configuration',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  })

  // Route pour réinitialiser la configuration aux valeurs par défaut
  app.post('/user-config/reset', async (request, reply) => {
    const user = await getAuthUser(request)
    if (!user) {
      return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
    }

    try {
      const resetConfig = await resetUserConfig(user.id)

      // Convertir les champs pour la réponse
      const processedConfig = {
        ...resetConfig,
        ratioX: parseFloat(resetConfig.ratioX),
        ratioY: parseFloat(resetConfig.ratioY),
        largeRatioX: parseFloat(resetConfig.largeRatioX),
        largeRatioY: parseFloat(resetConfig.largeRatioY),
        largeFactor: parseFloat(resetConfig.largeFactor),
        palette: JSON.parse(resetConfig.palette)
      }

      return reply.send({
        success: true,
        config: processedConfig,
        message: 'Configuration réinitialisée avec succès'
      })
    } catch (error) {
      console.error(error)
      return reply.status(500).send({
        error: 'Erreur lors de la réinitialisation de la configuration',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  })
}
