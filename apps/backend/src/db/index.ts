import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from '../schema/index.js'
import env from '../env.js'

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
})

export const db = drizzle(pool, { schema, mode: 'default' })

export * from './users/index.js'
export * from './territories/index.js'
export * from './userConfig/index.js'
