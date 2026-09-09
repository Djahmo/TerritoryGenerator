import { beforeEach, expect, it, vi } from 'vitest'

vi.mock('../src/utils', () => ({ sendApiC: vi.fn() }))
vi.hoisted(() => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  })
  vi.stubGlobal('window', { localStorage: globalThis.localStorage })
})
import { sendApiC } from '../src/utils'
import { useUser } from '../src/hooks/useUser'

beforeEach(() => useUser.getState().clearUserCache())

it('does not restore a user when a delayed /me request resolves after logout', async () => {
  let resolve!: (value: object) => void
  vi.mocked(sendApiC).mockImplementationOnce(() => new Promise(done => { resolve = done }))
  const request = useUser.getState().fetchMe()
  useUser.getState().clearUserCache()
  resolve({ id: 'alice', username: 'Alice', email: 'alice@example.test' })
  await request
  expect(useUser.getState().user).toBeNull()
  expect(useUser.getState().loading).toBe(false)
})

it('keeps the newest /me result if older requests finish later', async () => {
  let resolve!: (value: object) => void
  vi.mocked(sendApiC).mockImplementationOnce(() => new Promise(done => { resolve = done }))
  const oldRequest = useUser.getState().fetchMe()
  vi.mocked(sendApiC).mockResolvedValueOnce({ id: 'bob', username: 'Bob', email: 'bob@example.test' })
  await useUser.getState().fetchMe()
  resolve({ id: 'alice', username: 'Alice', email: 'alice@example.test' })
  await oldRequest
  expect(useUser.getState().user?.id).toBe('bob')
})
