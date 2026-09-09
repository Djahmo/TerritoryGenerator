import Fastify from 'fastify'
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

vi.mock('../src/lib/secure/storage.js', async () => ({ imageRoot: await mkdtemp(path.join(os.tmpdir(), 'territory-images-test-')) }))
vi.mock('../src/lib/secure/auth.js', () => ({ default: vi.fn() }))
import getAuthUser from '../src/lib/secure/auth.js'
import { imageRoot } from '../src/lib/secure/storage.js'
import { registerPrivateImageRoutes } from '../src/routes/privateImages.js'

const userId = 'a'.repeat(21)
const otherId = 'b'.repeat(21)
const app = Fastify()
beforeAll(async () => {
  await mkdir(path.join(imageRoot, userId))
  await mkdir(path.join(imageRoot, otherId))
  await writeFile(path.join(imageRoot, userId, 'Été #42-standard.png'), 'owner-image')
  await writeFile(path.join(imageRoot, otherId, '42-standard.png'), 'other-image')
  await symlink(path.join(imageRoot, otherId, '42-standard.png'), path.join(imageRoot, userId, 'link-standard.png'))
  await app.register(registerPrivateImageRoutes)
})
beforeEach(() => vi.mocked(getAuthUser).mockResolvedValue({ id: userId } as never))
afterAll(async () => { await app.close(); await rm(imageRoot, { recursive: true, force: true }) })

it('serves the owner’s image, including encoded names, without caching', async () => {
  const response = await app.inject(`/p/${userId}/${encodeURIComponent('Été #42-standard.png')}`)
  expect(response.statusCode).toBe(200)
  expect(response.body).toBe('owner-image')
  expect(response.headers['cache-control']).toBe('private, no-store')
})
it('rejects anonymous GET and HEAD requests', async () => {
  vi.mocked(getAuthUser).mockResolvedValue(null)
  for (const method of ['GET', 'HEAD'] as const) {
    expect((await app.inject({ method, url: `/p/${userId}/42-standard.png` })).statusCode).toBe(401)
  }
})
it('rejects images owned by another account', async () => {
  expect((await app.inject(`/p/${otherId}/42-standard.png`)).statusCode).toBe(404)
})
it('rejects symlink escapes and encoded path separators', async () => {
  expect((await app.inject(`/p/${userId}/link-standard.png`)).statusCode).toBe(404)
  expect((await app.inject(`/p/${userId}/..%2F${otherId}%2F42-standard.png`)).statusCode).toBe(404)
})
