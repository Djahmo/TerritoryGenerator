import { db } from  '../index.js'
import { users, passwordResetTokens } from '../../schema/index.js'
import { eq, sql } from 'drizzle-orm'

export const createPasswordResetToken = async (data: {
  email: string
  token: string
  expiresAt: Date
}) =>
  await db.insert(passwordResetTokens).values(data)

export const confirmUserEmail = async (userId: string) =>
  await db.update(users).set({ emailVerified: sql`CURRENT_TIMESTAMP`}).where(eq(users.id, userId))

export const getPasswordResetToken = async (token: string) =>
  await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).limit(1).then(r => r[0])

export const deletePasswordResetToken = async (token: string) =>
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token))

export const updateUserPassword = async (userId: string, hashedPassword: string) =>
  await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId))
