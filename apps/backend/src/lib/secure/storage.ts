import path from 'node:path'
import env from '../../env.js'

// Keep the existing STATIC_PATH convention, shared by reads and writes.
export const imageRoot = path.resolve(process.cwd() + env.STATIC_PATH)
