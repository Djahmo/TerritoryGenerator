import jwt from 'jsonwebtoken'
import env from '../../env.js'

export const createToken = (userId: string, expiresIn: jwt.SignOptions['expiresIn'] = '1h') => {
  return jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn,
  })
}

export const verifyToken = (token: string): { userId: string } => {
  return jwt.verify(token, env.JWT_SECRET) as { userId: string }
}
