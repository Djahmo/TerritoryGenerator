import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { territoryLayerService } from '../services/territoryLayerService.js'
import getAuthUser from '../lib/secure/auth.js'

// Schémas de validation
const layerSchema = z.object({
  territoryNumber: z.string(),
  imageType: z.enum(['standard', 'large']),
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  name: z.string().optional(),
  style: z.string(), // JSON stringifié
  layerType: z.enum(['brush', 'line', 'arrow', 'circle', 'rectangle', 'text', 'parking', 'compass']),
  layerData: z.string(), // JSON stringifié
})

const updateLayerSchema = z.object({
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  name: z.string().optional(),
  style: z.string().optional(),
  layerData: z.string().optional(),
})

export const registerTerritoryLayersRoutes = (app: FastifyInstance) => {
  // Middleware d'authentification
  app.addHook('onRequest', getAuthUser)

  // Récupérer tous les layers d'un territoire
  app.get('/territories/:territoryNumber/layers', {
    schema: {
      querystring: z.object({
        imageType: z.enum(['standard', 'large']).optional()
      }).parse
    }
  }, async (request, reply) => {
    const { territoryNumber } = request.params as { territoryNumber: string }
    const { imageType } = request.query as { imageType?: string }
    const userId = request.user.id

    try {
      const layers = await territoryLayerService.getLayersByTerritory(userId, territoryNumber, imageType)
      return reply.status(200).send({
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
  app.post('/territories/:territoryNumber/layers', {
    schema: {
      body: layerSchema.parse
    }
  }, async (request, reply) => {
    const { territoryNumber } = request.params as { territoryNumber: string }
    const userId = request.user.id
    const {
      imageType,
      layerType,
      layerData,
      style,
      name,
      visible,
      locked
    } = request.body as z.infer<typeof layerSchema>

    try {
      const layer = await territoryLayerService.createLayer(
        userId,
        territoryNumber,
        imageType,
        layerType,
        layerData,
        style,
        name,
        visible,
        locked
      )

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
    const userId = request.user.id

    try {
      const layer = await territoryLayerService.getLayer(userId, layerId)
      
      if (!layer) {
        return reply.status(404).send({
          success: false,
          message: 'Layer non trouvé'
        })
      }

      return reply.status(200).send({
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
  app.patch('/territories/layers/:layerId', {
    schema: {
      body: updateLayerSchema.parse
    }
  }, async (request, reply) => {
    const { layerId } = request.params as { layerId: string }
    const userId = request.user.id
    const updates = request.body as z.infer<typeof updateLayerSchema>

    try {
      const success = await territoryLayerService.updateLayer(userId, layerId, updates)
      
      if (!success) {
        return reply.status(404).send({
          success: false,
          message: 'Layer non trouvé ou non modifié'
        })
      }

      return reply.status(200).send({
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
    const userId = request.user.id

    try {
      const success = await territoryLayerService.deleteLayer(userId, layerId)
      
      if (!success) {
        return reply.status(404).send({
          success: false,
          message: 'Layer non trouvé ou non supprimé'
        })
      }

      return reply.status(200).send({
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
  app.delete('/territories/:territoryNumber/layers', {
    schema: {
      querystring: z.object({
        imageType: z.enum(['standard', 'large']).optional()
      }).parse
    }
  }, async (request, reply) => {
    const { territoryNumber } = request.params as { territoryNumber: string }
    const { imageType } = request.query as { imageType?: string }
    const userId = request.user.id

    try {
      const count = await territoryLayerService.deleteLayersByTerritory(userId, territoryNumber, imageType)
      
      return reply.status(200).send({
        success: true,
        message: `${count} layers supprimés avec succès`
      })
    } catch (error) {
      console.error('Erreur lors de la suppression des layers:', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la suppression des layers'
      })    }
  })
}
