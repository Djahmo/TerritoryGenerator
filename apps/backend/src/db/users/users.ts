import { db } from  '../index.js'
import { users } from '../../schema/index.js'
import { eq, like, sql } from 'drizzle-orm'

export const getUserById = async (id: string) =>
  await db.select().from(users).where(eq(users.id, id)).limit(1).then(r => r[0])

export const getUserByEmail = async (email: string) =>
  await db.select().from(users).where(eq(users.email, email)).limit(1).then(r => r[0])

export const getUserByUsername = async (username: string) =>
  await db.select().from(users).where(eq(users.username, username)).limit(1).then(r => r[0])


export const searchUsersByUsername = async (query: string, limit: number, offset: number) => {
  return db
    .select({
      id: users.id,
      username: users.username
    })
    .from(users)
    .where(
      like(
        sql`LOWER(${users.username})`,
        `${query.toLowerCase()}%`
      )
    )
    .orderBy(users.username)
    .limit(limit + 1)
    .offset(offset)
}

export const createUser = async (data: {
  id: string
  username: string
  email: string
  password: string
}) => await db.insert(users).values(data)

export const disableUser = async (id: string) =>
  await db.update(users).set({ disabled: true }).where(eq(users.id, id))

