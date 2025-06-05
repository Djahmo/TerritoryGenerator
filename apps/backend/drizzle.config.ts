import { defineConfig } from 'drizzle-kit'
import env from './src/env'

export default defineConfig({
  schema: './src/schema/drizzle.ts',
  out: './src/migrations',
  dialect: 'mysql',
  dbCredentials: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  },
})
