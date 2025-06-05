import { db } from  '../index.js'
import { sessions } from '../../schema/index.js'
import { eq, lt } from 'drizzle-orm'

export const getSessionById = async (id: string) => {
  return db.select().from(sessions).where(eq(sessions.id, id)).limit(1)
}

export const createSession = async (id: string, token:string, userId: string, expiresAt: Date) => {
  return db.insert(sessions).values({ id, token, userId, expiresAt })
}

export const deleteSession = async (token: string) => {
  return db.delete(sessions).where(eq(sessions.token, token))
}

export const deleteAllUserSessions = async (userId: string) => {
  return db.delete(sessions).where(eq(sessions.userId, userId))
}

export const deleteExpiredSessions = async () => {
  return db.delete(sessions).where(lt(sessions.expiresAt, new Date()))
}

