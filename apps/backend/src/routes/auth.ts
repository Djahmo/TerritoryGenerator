import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { nanoid } from 'nanoid'
import {
  getUserById,
  getUserByEmail,
  getUserByUsername,
  createUser,
  createPasswordResetToken,
  confirmUserEmail,
  getPasswordResetToken,
  deletePasswordResetToken,
  updateUserPassword,
  createSession,
  deleteSession
} from '../db/index.js'
import env from '../env.js'

import { sendMailNoReply } from '../lib/mail/index.js'
import { createToken, verifyToken } from '../lib/secure/jwt.js'
import { expiresAtTime, setCookie, clearCookie } from '../lib/secure/cookie.js'
import getAuthUser from '../lib/secure/auth.js'

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,64}$/

export const registerAuthRoutes = (app: FastifyInstance) => {
  app.post('/auth/register', async (request, reply) => {
    const bodySchema = z.object({
      username: z.string()
        .min(3, { message: 'api.error.auth.username.tooShort' })
        .max(20, { message: 'api.error.auth.username.tooLong' })
        .regex(/^[a-zA-Z0-9_]+$/, { message: 'api.error.auth.username.invalidChars' }),
      email: z.string().email({ message: 'api.error.auth.email.invalid' }),
      password: z.string()
        .regex(passwordRegex, { message: 'api.error.auth.password.invalidChars' }),
    })

    const parse = bodySchema.safeParse(request.body)
    if (!parse.success) {
      return reply.status(400).send({ errors: parse.error.errors })
    }

    const { username, email, password } = parse.data

    const lang = request.headers['accept-language']?.toString().slice(0, 2) || 'gb'

    const existingByUsername = await getUserByUsername(username)
    const existingByEmail = await getUserByEmail(email)

    if (existingByUsername || existingByEmail) {
      return reply.status(409).send({ message: 'api.error.auth.alreadyExists' })
    }

    const id = nanoid()
    const hashed = await bcrypt.hash(password, 10)
    await createUser({ id, username, email, password: hashed })

    const token = createToken(id, '30y')
    const link = `${env.FRONTEND_URL}/auth/confirm?token=${token}`

    try {
      await sendMailNoReply({
        type: 'confirmation',
        lang,
        to: email,
        data: {
          name: username,
          link,
        }
      })
    }
    catch (error) {
      console.error('Error sending confirmation email:', error)
      return reply.status(500).send({ message: 'api.error.auth.email.send' })
    }

    const duration = 7
    const expiresAt = expiresAtTime(duration)
    const sessionToken = createToken(id, `${duration}d`)

    await createSession(nanoid(), sessionToken, id, expiresAt)

    setCookie(reply, 'sessionToken', sessionToken, duration)

    return reply.send({ ok: true })
  })

  app.post('/auth/confirm', async (request, reply) => {
    const bodySchema = z.object({
      token: z.string(),
    })
    const parse = bodySchema.safeParse(request.body)
    if (!parse.success) {
      return reply.status(400).send({ errors: parse.error.errors })
    }

    const { token } = parse.data
    let userId: string
    try {
      const payload = verifyToken(token)
      userId = payload.userId
    } catch {
      return reply.status(400).send({ message: 'api.error.auth.invalidOrExpiredToken' })
    }

    const user = await getUserById(userId)
    if (!user) {
      return reply.status(404).send({ message: 'api.error.auth.userNotFound' })
    }
    if (user.emailVerified) {
      return reply.status(405).send({ message: 'api.error.auth.alreadyVerified' })
    }

    await confirmUserEmail(userId)

    return reply.send({ ok: true })
  })

  app.post('/auth/login', async (request, reply) => {
    const bodySchema = z.object({
      email: z.string(),
      password: z.string(),
      remember: z.boolean().optional(),
    })

    const parse = bodySchema.safeParse(request.body)
    if (!parse.success) {
      return reply.status(400).send({ errors: parse.error.errors })
    }

    const { email, password, remember } = parse.data

    const user = await getUserByEmail(email)

    if (!user) {
      return reply.status(401).send({ message: 'api.error.auth.invalidCredentials' })
    }

    const match = await bcrypt.compare(password, user.password || '')
    if (!match) {
      return reply.status(401).send({ message: 'api.error.auth.invalidCredentials' })
    }

    const duration = remember ? 365 : 7
    const expiresAt = expiresAtTime(duration)
    const sessionToken = createToken(user.id, `${duration}d`)

    await createSession(nanoid(), sessionToken, user.id, expiresAt)

    setCookie(reply, 'sessionToken', sessionToken, duration)

    return reply.send({ ok: true })
  })

  app.get('/auth/logout', async (request, reply) => {
    const token = request.cookies.sessionToken
    if (!token) {
      return reply.status(401).send({ message: 'api.error.auth.unauthorized' })
    }

    if (token) {
      try {
        await deleteSession(token)
      } catch {
        return reply.status(500).send({ message: 'api.error.internalServerError' })
      }
    }

    clearCookie(reply, 'sessionToken')
    return reply.send({ ok: true })
  })

  app.post('/auth/reset', async (request, reply) => {
    const bodySchema = z.object({
      email: z.string().email({ message: 'api.error.auth.email.invalid' }),
    })

    const parse = bodySchema.safeParse(request.body)
    if (!parse.success) {
      return reply.status(400).send({ errors: parse.error.errors })
    }

    const { email } = parse.data
    const user = await getUserByEmail(email)

    if (!user) return reply.send({ ok: true })

    const token = createToken(user.id, '1h')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60)
    await createPasswordResetToken({ email, token, expiresAt })

    const lang = request.headers['accept-language']?.toString().slice(0, 2) || 'gb'

    const link = `${env.FRONTEND_URL}/auth/reset?token=${token}`

    try {
      await sendMailNoReply({
        type: 'reset',
        lang,
        to: email,
        data: {
          name: user.username,
          link,
        }
      })
    }
    catch (error) {
      console.error('Error sending reset email:', error)
      return reply.status(500).send({ message: 'api.error.auth.email.send' })
    }

    return reply.send({ ok: true })
  })

  app.post('/auth/reset/confirm', async (request, reply) => {
    const bodySchema = z.object({
      token: z.string(),
      password: z.string()
        .min(6, { message: 'api.error.auth.password.tooShort' })
        .max(64, { message: 'api.error.auth.password.tooLong' })
        .regex(passwordRegex, { message: 'api.error.auth.password.invalidChars' }),
    })

    const parse = bodySchema.safeParse(request.body)
    if (!parse.success) {
      return reply.status(400).send({ errors: parse.error.errors })
    }

    const { token, password } = parse.data
    const entry = await getPasswordResetToken(token)

    if (!entry || new Date(entry.expiresAt) < new Date()) {
      return reply.status(400).send({ message: 'api.error.auth.invalidOrExpiredToken' })
    }

    const user = await getUserByEmail(entry.email)
    if (!user) {
      return reply.status(400).send({ message: 'api.error.auth.invalidOrExpiredToken' })
    }

    const hashed = await bcrypt.hash(password, 10)
    await updateUserPassword(user.id, hashed)
    await deletePasswordResetToken(token)

    return reply.send({ ok: true })
  })

  app.get('/me', async (request, reply) => {
    const user = await getAuthUser(request)
    if (!user) return reply.status(401).send({ message: 'api.error.auth.unauthorized' })

    try {
      return reply.send({
        id: user.id,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      })
    } catch {
      return reply.status(500).send({ message: 'api.error.me.fetch' })
    }
  })
}
