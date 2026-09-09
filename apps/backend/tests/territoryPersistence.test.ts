import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => {
  const select = vi.fn(), remove = vi.fn(), insert = vi.fn()
  const tx = { select, delete: remove, insert }
  return { tx, transaction: vi.fn(async (work: (tx: typeof tx) => unknown) => work(tx)) }
})
vi.mock('../src/db/index.js', () => ({ db: { transaction: mocks.transaction } }))
vi.mock('../src/env.js', () => ({ default: { FRONTEND_URL: 'http://localhost' } }))
vi.mock('../src/lib/secure/storage.js', () => ({ imageRoot: '/tmp/territory-test' }))
import { saveTerritoryData, saveTerritoryLayers } from '../src/db/territories/index'
import { images, layers } from '../src/schema/territories'
import { makeGpx } from '../../frontend/src/utils/territoryFiles'
const polygon = [{ lat: 48, lon: 2 }, { lat: 49, lon: 2 }, { lat: 48, lon: 3 }]
const old = { num: '1', name: 'Old', polygon }
const values = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  const result = { for: vi.fn().mockResolvedValue([{ data: makeGpx([old]) }]) }
  mocks.tx.select.mockReturnValue({ from: () => ({ where: () => ({ ...result, limit: () => result }) }) })
  mocks.tx.delete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
  values.mockReturnValue({ onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined) })
  mocks.tx.insert.mockReturnValue({ values })
})
it('keeps both formats and annotations when only a name changes', async () => {
  await saveTerritoryData('alice', makeGpx([{ ...old, name: 'New' }]))
  expect(mocks.tx.delete).not.toHaveBeenCalled()
})
it.each(['changed', 'removed'])('invalidates images and annotations when geometry is %s', async kind => {
  const incoming = kind === 'changed' ? { ...old, polygon: polygon.map(p => ({ ...p, lat: p.lat + 0.01 })) } : { ...old, num: '2' }
  await saveTerritoryData('alice', makeGpx([incoming]))
  expect(mocks.tx.delete.mock.calls.map(call => call[0])).toEqual([images, layers])
  expect(mocks.transaction).toHaveBeenCalledTimes(1)
})
it('clears an empty drawing through the same replacement transaction', async () => {
  await saveTerritoryLayers('alice', '1', 'standard', [])
  expect(mocks.tx.delete).toHaveBeenCalledWith(layers)
  expect(mocks.tx.insert).not.toHaveBeenCalled()
})
it('persists explicit stacking order and identities for all shapes', async () => {
  const document = ['first', 'second'].map(id => ({ id, type: 'parking', visible: false, locked: true, timestamp: 123, style: { color: '#000' }, data: { position: { x: 0, y: 0 } } }))
  await saveTerritoryLayers('alice', '1', 'large', document)
  const rows = values.mock.calls[0][0]
  expect(rows.map((row: { layerData: string }) => JSON.parse(row.layerData)._document)).toEqual([{ id: 'first', order: 0, timestamp: 123 }, { id: 'second', order: 1, timestamp: 123 }])
  expect(rows[0]).toMatchObject({ visible: false, locked: true, imageType: 'large' })
})
