import { mysqlTable, timestamp, varchar, text, longtext, boolean, datetime, int, float, decimal } from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

export const users = mysqlTable('users', {
  id: varchar('id', { length: 21 }).primaryKey(),
  username: varchar('username', { length: 64 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: timestamp('emailVerified'),
  password: varchar('password', { length: 255 }),
  disabled: boolean('disabled').default(false),
  moneyWin: int('moneyWin').default(0),
  moneyLose: int('moneyLose').default(0),
  createdAt: timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updatedAt').default(sql`CURRENT_TIMESTAMP`).onUpdateNow()
})

export const passwordResetTokens = mysqlTable('passwordResetTokens', {
  token: varchar('token', { length: 500 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  expiresAt: datetime('expiresAt').notNull(),
})

export const sessions = mysqlTable('sessions', {
  id: varchar('id', { length: 21 }).primaryKey(),
  userId: varchar('userId', { length: 255 }).notNull().references(() => users.id),
  token: text('token').notNull(),
  expiresAt: datetime('expiresAt').notNull(),
  createdAt: datetime('createdAt').default(sql`CURRENT_TIMESTAMP`),
})

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
  name: varchar('name', { length: 100 }),
  style: text('style').notNull(), // Style JSON (couleur, épaisseur, etc.)
  layerType: varchar('layerType', { length: 20 }).notNull(), // 'brush', 'line', 'arrow', 'circle', 'rectangle', 'text', 'parking', 'compass'
  layerData: text('layerData').notNull(), // Données de la couche en JSON
  createdAt: timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updatedAt').default(sql`CURRENT_TIMESTAMP`).onUpdateNow()
})

export const territories = mysqlTable('territories', {
  userId: varchar('userId', { length: 21 }).primaryKey().references(() => users.id),
  data: longtext('data').notNull(), // Contient les données GPX
  createdAt: timestamp('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updatedAt').default(sql`CURRENT_TIMESTAMP`).onUpdateNow()
})

export const userConfigs = mysqlTable('userConfigs', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('userId', { length: 255 }).notNull().references(() => users.id),

  // Configuration du canvas/papier
  ppp: int('ppp').notNull().default(250),
  ratioX: decimal('ratioX', { precision: 10, scale: 6 }).notNull().default('1.618000'),
  ratioY: decimal('ratioY', { precision: 10, scale: 6 }).notNull().default('1.000000'),
  largeRatioX: decimal('largeRatioX', { precision: 10, scale: 6 }).notNull().default('1.000000'),
  largeRatioY: decimal('largeRatioY', { precision: 10, scale: 6 }).notNull().default('1.618000'),
  largeFactor: decimal('largeFactor', { precision: 5, scale: 3 }).notNull().default('0.200'),

  // Configuration de génération d'images
  contourColor: varchar('contourColor', { length: 50 }).notNull().default('red'),
  contourWidth: int('contourWidth').notNull().default(8),
  thumbnailWidth: int('thumbnailWidth').notNull().default(500),
  palette: text('palette').notNull().default('["rgba(0,0,0,1)","rgba(255,0,0,1)","rgba(0,128,0,1)","rgba(0,0,255,1)","rgba(255,255,0,1)","rgba(0,255,255,1)","rgba(255,0,255,1)","rgba(255,255,255,1)","rgba(255,165,0,1)","rgba(128,0,128,1)","rgba(255,192,203,1)","rgba(165,42,42,1)","rgba(128,128,128,1)"]'),

  // Configuration réseau
  networkRetries: int('networkRetries').notNull().default(3),
  networkDelay: int('networkDelay').notNull().default(1000),
  ignApiRateLimit: int('ignApiRateLimit').notNull().default(40),

  // Configuration API IGN
  ignApiBaseUrl: varchar('ignApiBaseUrl', { length: 255 }).notNull().default('https://data.geopf.fr/wms-r'),
  ignApiLayer: varchar('ignApiLayer', { length: 255 }).notNull().default('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2'),
  ignApiFormat: varchar('ignApiFormat', { length: 50 }).notNull().default('image/png'),
  ignApiCRS: varchar('ignApiCRS', { length: 50 }).notNull().default('EPSG:4326'),

  createdAt: timestamp('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
})
