import Fastify from 'fastify'
import { registerAuthRoutes } from './routes/auth.js'
import { registerTerritoryRoutes } from './routes/territories.js'
import { registerUserConfigRoutes } from './routes/userConfig.js'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import env from './env.js'
import { registerPrivateImageRoutes } from './routes/privateImages.js'
import fastifyMultipart from '@fastify/multipart'

const app = Fastify({
  // Augmenter la limite du body pour les requêtes JSON (50MB)
  bodyLimit: 50 * 1024 * 1024
})

await app.register(cookie)
await app.register(cors, {
  origin: [env.FRONTEND_URL, env.FRONTEND_URL.replace('http', 'ws')],
  credentials: true,
})
await app.register(registerPrivateImageRoutes)

await app.register(fastifyMultipart, {
  sharedSchemaId: 'file',
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
})

app.get('/ping', async () => ({ pong: true }))

registerAuthRoutes(app)
registerTerritoryRoutes(app)
registerUserConfigRoutes(app)

app.listen({ port: env.API_PORT }, () => {
  console.log(`API server running at http://localhost:${env.API_PORT}`)
})
