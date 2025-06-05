import type { FastifyReply } from 'fastify'

import env from '../../env.js'

export const expiresAtTime = (days: number) => new Date(Date.now() + 1000 * 60 * 60 * 24 * days)

export const setCookie = (reply: FastifyReply, name:string, token:string, days:number) => {
  reply.setCookie(name, token, {
    path: '/',
    httpOnly: true,
    secure: env.SECURE_COOKIES,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * days,
  })
}

export const clearCookie = (reply: FastifyReply, name: string) => {
  reply.clearCookie(name, {
    path: '/',
    httpOnly: true,
    secure: env.SECURE_COOKIES,
    sameSite: 'lax',
  })
}
