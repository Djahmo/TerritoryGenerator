import Fastify from 'fastify'
import { registerAuthRoutes } from './routes/auth.js'
import { registerTerritoryRoutes } from './routes/territories.js'
import { registerUserConfigRoutes } from './routes/userConfig.js'
import { registerTerritoryLayersRoutes } from './routes/territoryLayers.js'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import env from './env.js'
import fastifyStatic from '@fastify/static'
import fastifyMultipart from '@fastify/multipart'

const app = Fastify()

await app.register(cookie)
await app.register(cors, {
  origin: [env.FRONTEND_URL, env.FRONTEND_URL.replace('http', 'ws')],
  credentials: true,
})
await app.register(fastifyStatic, {
  root: process.cwd()+env.STATIC_PATH,
  prefix: '/p/',
})

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
registerTerritoryLayersRoutes(app)

app.listen({ port: env.API_PORT }, () => {
  console.log(`API server running at http://localhost:${env.API_PORT}`)
})
