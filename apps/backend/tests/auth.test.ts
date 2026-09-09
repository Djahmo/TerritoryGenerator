import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

const fixtures = vi.hoisted(() => ({
  user: { id: 'a'.repeat(21), username: 'alice', email: 'alice@example.test', password: 'hash', disabled: false, emailVerified: null },
  sessions: new Map<string, { userId: string; expiresAt: Date }>(),
  confirmUserEmail: vi.fn(), resetPasswordWithToken: vi.fn(),
}))
vi.mock('../src/env.js', () => ({ default: { JWT_SECRET: 'test-secret', SECURE_COOKIES: false, FRONTEND_URL: 'http://localhost' } }))
vi.mock('bcrypt', () => ({ default: { compare: vi.fn().mockResolvedValue(true), hash: vi.fn().mockResolvedValue('new-hash') } }))
vi.mock('../src/lib/mail/index.js', () => ({ sendMailNoReply: vi.fn() }))
vi.mock('../src/db/index.js', () => ({
  getUserById: vi.fn(async () => fixtures.user), getUserByEmail: vi.fn(async () => fixtures.user),
  getUserByUsername: vi.fn(), createUser: vi.fn(), createPasswordResetToken: vi.fn(),
  confirmUserEmail: fixtures.confirmUserEmail,
  getPasswordResetToken: vi.fn(async () => ({ email: fixtures.user.email, expiresAt: new Date(Date.now() + 60_000) })),
  deletePasswordResetToken: vi.fn(), resetPasswordWithToken: fixtures.resetPasswordWithToken,
  getSessionByToken: vi.fn(async (token: string) => fixtures.sessions.get(token)),
  createSession: vi.fn(async (_id: string, token: string, userId: string, expiresAt: Date) => { fixtures.sessions.set(token, { userId, expiresAt }) }),
  deleteSession: vi.fn(async (token: string) => { fixtures.sessions.delete(token) }),
}))
import { createToken, verifyToken } from '../src/lib/secure/jwt.js'
import { registerAuthRoutes } from '../src/routes/auth.js'
import { sendMailNoReply } from '../src/lib/mail/index.js'

const buildApp = async () => {
  const app = Fastify()
  await app.register(cookie)
  registerAuthRoutes(app)
  return app
}

beforeEach(() => {
  vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
  vi.mocked(bcrypt.hash).mockResolvedValue('new-hash' as never)
  fixtures.sessions.clear()
  fixtures.user.disabled = false
  fixtures.confirmUserEmail.mockReset()
  fixtures.resetPasswordWithToken.mockReset().mockImplementation(async () => { fixtures.sessions.clear(); return true })
})

describe('Purpose-bound JWTs', () => {
  it('rejects every cross-purpose combination and legacy tokens', () => {
    const purposes = ['session', 'email-confirmation', 'password-reset'] as const
    for (const purpose of purposes) {
      const token = createToken(fixtures.user.id, purpose)
      expect(verifyToken(token, purpose).userId).toBe(fixtures.user.id)
      for (const other of purposes.filter(value => value !== purpose)) expect(() => verifyToken(token, other)).toThrow()
    }
    const legacy = jwt.sign({ userId: fixtures.user.id }, 'test-secret', { expiresIn: '1h' })
    expect(() => verifyToken(legacy, 'session')).toThrow()
    expect(createToken(fixtures.user.id, 'session')).not.toBe(createToken(fixtures.user.id, 'session'))
  })
  it('rejects expired tokens', () => {
    expect(() => verifyToken(createToken(fixtures.user.id, 'session', -1), 'session')).toThrow()
  })
})

describe('Authentication routes', () => {
  it('resends confirmation only to the authenticated account', async () => {
    const app = await buildApp()
    try {
      expect((await app.inject({ method: 'POST', url: '/auth/confirm/resend' })).statusCode).toBe(401)
      const token = createToken(fixtures.user.id, 'session')
      fixtures.sessions.set(token, { userId: fixtures.user.id, expiresAt: new Date(Date.now() + 60_000) })
      const response = await app.inject({ method: 'POST', url: '/auth/confirm/resend', cookies: { sessionToken: token } })
      expect(response.statusCode).toBe(200)
      const mail = vi.mocked(sendMailNoReply).mock.calls.at(-1)![0]
      expect(mail.to).toBe(fixtures.user.email)
      const confirmation = new URL(mail.data.link).searchParams.get('token')!
      expect(verifyToken(confirmation, 'email-confirmation').userId).toBe(fixtures.user.id)
      expect(() => verifyToken(confirmation, 'session')).toThrow()
    } finally { await app.close() }
  })
  it('accepts a registered session and rejects replay after logout', async () => {
    const app = await buildApp()
    try {
      const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: fixtures.user.email, password: 'Password!123', remember: true } })
      expect(login.statusCode).toBe(200)
      const cookieValue = login.cookies.find(value => value.name === 'sessionToken')!.value
      const cookies = { sessionToken: cookieValue }
      expect((await app.inject({ url: '/me', cookies })).statusCode).toBe(200)
      expect((await app.inject({ url: '/auth/logout', cookies })).statusCode).toBe(200)
      expect((await app.inject({ url: '/me', cookies })).statusCode).toBe(401)
    } finally { await app.close() }
  })
  it('rejects absent, expired, mismatched and disabled sessions', async () => {
    const app = await buildApp()
    try {
      const token = createToken(fixtures.user.id, 'session')
      const request = () => app.inject({ url: '/me', cookies: { sessionToken: token } })
      expect((await request()).statusCode).toBe(401)
      fixtures.sessions.set(token, { userId: fixtures.user.id, expiresAt: new Date(0) })
      expect((await request()).statusCode).toBe(401)
      fixtures.sessions.set(token, { userId: 'other', expiresAt: new Date(Date.now() + 60_000) })
      expect((await request()).statusCode).toBe(401)
      fixtures.sessions.set(token, { userId: fixtures.user.id, expiresAt: new Date(Date.now() + 60_000) })
      fixtures.user.disabled = true
      expect((await request()).statusCode).toBe(401)
      expect((await app.inject({ method: 'POST', url: '/auth/login', payload: { email: fixtures.user.email, password: 'Password!123' } })).statusCode).toBe(401)
    } finally { await app.close() }
  })
  it('requires the correct purpose for confirmation, reset and session cookies', async () => {
    const app = await buildApp()
    try {
      const token = createToken(fixtures.user.id, 'session')
      expect((await app.inject({ method: 'POST', url: '/auth/confirm', payload: { token } })).statusCode).toBe(400)
      expect(fixtures.confirmUserEmail).not.toHaveBeenCalled()
      expect((await app.inject({ method: 'POST', url: '/auth/reset/confirm', payload: { token, password: 'Password!123' } })).statusCode).toBe(400)
      const reset = createToken(fixtures.user.id, 'password-reset')
      expect((await app.inject({ url: '/me', cookies: { sessionToken: reset } })).statusCode).toBe(401)
      const confirmation = createToken(fixtures.user.id, 'email-confirmation')
      expect((await app.inject({ method: 'POST', url: '/auth/confirm', payload: { token: confirmation } })).statusCode).toBe(200)
      expect(fixtures.confirmUserEmail).toHaveBeenCalledWith(fixtures.user.id)
    } finally { await app.close() }
  })
  it('uses atomic reset and clears the browser session', async () => {
    const app = await buildApp()
    try {
      const token = createToken(fixtures.user.id, 'password-reset')
      const response = await app.inject({ method: 'POST', url: '/auth/reset/confirm', payload: { token, password: 'Password!123' } })
      expect(response.statusCode).toBe(200)
      expect(fixtures.resetPasswordWithToken).toHaveBeenCalledWith(token, fixtures.user.id, 'new-hash')
      expect(response.cookies.find(value => value.name === 'sessionToken')?.value).toBe('')
    } finally { await app.close() }
  })
})

it('keeps validation errors in the API errors array after the Zod upgrade', async () => {
  const app = await buildApp()
  try {
    const response = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'not-an-email' } })
    expect(response.statusCode).toBe(400)
    const body = response.json()
    expect(body.errors).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['password'], message: expect.any(String) })]))
  } finally { await app.close() }
})
