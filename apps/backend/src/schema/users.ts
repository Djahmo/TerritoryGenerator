import { mysqlTable, timestamp, varchar, text, boolean, datetime, int } from 'drizzle-orm/mysql-core'
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

