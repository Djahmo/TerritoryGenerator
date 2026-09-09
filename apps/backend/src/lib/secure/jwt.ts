import jwt from 'jsonwebtoken'
import env from '../../env.js'
import { randomUUID } from 'node:crypto'

export type TokenPurpose = 'session' | 'email-confirmation' | 'password-reset'

export const createToken = (userId: string, purpose: TokenPurpose, expiresIn: jwt.SignOptions['expiresIn'] = '1h') => {
  return jwt.sign({ userId, purpose }, env.JWT_SECRET, {
    expiresIn,
    algorithm: 'HS256',
    jwtid: randomUUID(),
  })
}

export const verifyToken = (token: string, purpose: TokenPurpose): { userId: string } => {
  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] })
  if (typeof payload === 'string' || payload.purpose !== purpose || typeof payload.userId !== 'string'
    || typeof payload.exp !== 'number') throw new Error('Invalid token purpose or payload')
  return { userId: payload.userId }
}
