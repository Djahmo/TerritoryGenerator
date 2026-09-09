import type { FastifyInstance } from 'fastify'
import fastifyStatic from '@fastify/static'
import { realpath } from 'node:fs/promises'
import getAuthUser from '../lib/secure/auth.js'
import { getUserDirectory, resolveWithin, userIdSchema } from '../lib/secure/imagePaths.js'
import { imageRoot } from '../lib/secure/storage.js'

export const registerPrivateImageRoutes = async (app: FastifyInstance) => {
  // Register sendFile without exposing the directory through a wildcard route.
  await app.register(fastifyStatic, { root: imageRoot, serve: false })
  app.get<{ Params: { userId: string; fileName: string } }>('/p/:userId/:fileName', {
    onRequest: async (request, reply) => {
      reply.header('Cache-Control', 'private, no-store')
      const user = await getAuthUser(request)
      if (!user) return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
      if (request.params.userId !== user.id) return reply.status(404).send({ message: 'Not found' })
    },
  }, async (request, reply) => {
    const { userId, fileName } = request.params
    if (!userIdSchema.safeParse(userId).success || /[\\/\x00-\x1f\x7f]/.test(fileName)
      || !/^.+-(standard|large|original|originalLarge)\.png$|^.+-miniature\.webp$/.test(fileName)) {
      return reply.status(404).send({ message: 'Not found' })
    }
    try {
      const directory = getUserDirectory(imageRoot, userId)
      const filePath = resolveWithin(directory, fileName)
      // Also reject symlinks leading outside the owner's directory.
      const [realRoot, realDirectory, realFile] = await Promise.all([realpath(imageRoot), realpath(directory), realpath(filePath)])
      if (realDirectory !== getUserDirectory(realRoot, userId)) throw new Error('Invalid user directory')
      resolveWithin(realDirectory, realFile)
      return reply.sendFile(fileName, directory, { cacheControl: false, lastModified: false, etag: false })
    } catch {
      return reply.status(404).send({ message: 'Not found' })
    }
  })
}
