import { db } from  '../index.js'
import { users, passwordResetTokens, sessions } from '../../schema/index.js'
import { eq, sql, and } from 'drizzle-orm'

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

// Consume the reset token and revoke access in the same transaction.
export const resetPasswordWithToken = async (token: string, userId: string, password: string) =>
  db.transaction(async tx => {
    const [entry] = await tx.select().from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token)).limit(1).for('update')
    if (!entry || entry.expiresAt <= new Date()) return false
    const [user] = await tx.select().from(users)
      .where(and(eq(users.id, userId), eq(users.email, entry.email))).limit(1).for('update')
    if (!user || user.disabled) return false
    await tx.update(users).set({ password }).where(eq(users.id, userId))
    await tx.delete(sessions).where(eq(sessions.userId, userId))
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.email, entry.email))
    return true
  })
