import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { z } from 'zod'
import { fileURLToPath } from 'url'

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env')})

const envSchema = z.object({
  DB_HOST: z.string(),
  DB_PORT: z.string().transform(Number),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  MAIL_HOST: z.string(),
  MAIL_PORT: z.string().transform(Number),
  MAIL_NOREPLY_TOKEN: z.string(),
  API_PORT: z.string().transform(Number),
  JWT_SECRET: z.string(),
  FRONTEND_URL: z.string(),
  SECURE_COOKIES: z.string().transform((val) => val === 'true'),
  STATIC_PATH: z.string(),
})

const env = envSchema.parse(process.env)

export default env
