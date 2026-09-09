import path from 'node:path'
import { z } from 'zod'

export const territoryNumberSchema = z.string().min(1).max(50)
  .refine(value => value !== '.' && value !== '..' && !/[\\/\x00-\x1f\x7f]/.test(value), 'Invalid territory number')
export const imageTypeSchema = z.enum(['standard', 'large', 'miniature', 'original', 'originalLarge'])
export const userIdSchema = z.string().regex(/^[A-Za-z0-9_-]{21}$/)

export const getImageFileName = (territoryNumber: string, imageType: string): string => {
  territoryNumberSchema.parse(territoryNumber)
  imageTypeSchema.parse(imageType)
  return `${territoryNumber}-${imageType}.${imageType === 'miniature' ? 'webp' : 'png'}`
}

export const resolveWithin = (root: string, ...segments: string[]): string => {
  const base = path.resolve(root)
  const target = path.resolve(base, ...segments)
  if (!target.startsWith(base + path.sep)) throw new Error('Invalid image path')
  return target
}

export const getUserDirectory = (root: string, userId: string): string =>
  resolveWithin(root, userIdSchema.parse(userId))

export const resolveImagePath = (root: string, userId: string, number: string, type: string): string =>
  resolveWithin(getUserDirectory(root, userId), getImageFileName(number, type))
