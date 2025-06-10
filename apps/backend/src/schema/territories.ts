import { mysqlTable, timestamp, varchar, text, int, float, boolean } from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'
import { users } from './users.js'

export const images = mysqlTable('images', {
  id: varchar('id', { length: 21 }).primaryKey(),
  userId: varchar('userId', { length: 21 }).notNull().references(() => users.id),
  territoryNumber: varchar('territoryNumber', { length: 50 }).notNull(),
  imageType: varchar('imageType', { length: 20 }).notNull(), // 'standard', 'original', 'large', 'originalLarge', 'miniature'
  fileName: varchar('fileName', { length: 255 }).notNull(),
  width: int('width'),
  height: int('height'),
  bbox: text('bbox'), // JSON: [minLon, minLat, maxLon, maxLat]
  rotation: float('rotation'), // Angle de rotation optimale
  cropData: text('cropData'), // JSON: données de crop si applicable
  createdAt: timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updatedAt').default(sql`CURRENT_TIMESTAMP`).onUpdateNow()
})

export const layers = mysqlTable('layers', {
  id: varchar('id', { length: 21 }).primaryKey(),
  userId: varchar('userId', { length: 21 }).notNull().references(() => users.id),
  territoryNumber: varchar('territoryNumber', { length: 50 }).notNull(),
  imageType: varchar('imageType', { length: 20 }).notNull(), // Type d'image associé ('standard' ou 'large')
  visible: boolean('visible').notNull().default(true),
  locked: boolean('locked').notNull().default(false),
  style: text('style').notNull(), // Style JSON (couleur, épaisseur, etc.)
  layerType: varchar('layerType', { length: 20 }).notNull(), // 'brush', 'line', 'arrow', 'circle', 'rectangle', 'text', 'parking', 'compass'
  layerData: text('layerData').notNull(), // Données de la couche en JSON
  createdAt: timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updatedAt').default(sql`CURRENT_TIMESTAMP`).onUpdateNow()
})

export const territories = mysqlTable('territories', {
  userId: varchar('userId', { length: 21 }).primaryKey().references(() => users.id),
  data: text('data').notNull(),
  createdAt: timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updatedAt').default(sql`CURRENT_TIMESTAMP`).onUpdateNow()
})
