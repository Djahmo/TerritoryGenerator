import { FastifyRequest } from "fastify"
import { getUserById } from "../../db/index.js"
import { verifyToken } from "./jwt.js"

const getAuthUser = async (request: FastifyRequest) => {
  const token = request.cookies.sessionToken
  if (!token) return null

  try {
    const decoded = verifyToken(token)
    const user = await getUserById(decoded.userId)
    return user || null
  } catch {
    return null
  }
}

export default getAuthUser
