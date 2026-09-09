import { FastifyRequest } from "fastify"
import { getUserById, getSessionByToken } from "../../db/index.js"
import { verifyToken } from "./jwt.js"

const getAuthUser = async (request: FastifyRequest) => {
  const token = request.cookies.sessionToken
  if (!token) return null

  try {
    const decoded = verifyToken(token, 'session')
    const session = await getSessionByToken(token)
    if (!session || session.userId !== decoded.userId || session.expiresAt <= new Date()) return null
    const user = await getUserById(decoded.userId)
    return user && !user.disabled ? user : null
  } catch {
    return null
  }
}

export default getAuthUser
