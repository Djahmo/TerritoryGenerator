import { afterEach, beforeEach, expect, it, vi } from 'vitest'

vi.mock('../src/hooks/useUser', async () => {
  const { create } = await import('zustand')
  return { useUser: create(() => ({ user: null as { id: string } | null })) }
})
import { useUser } from '../src/hooks/useUser'
import { useApiTerritoryStore } from '../src/hooks/useApiTerritory'
import { ApiTerritoryService } from '../src/services/apiTerritoryService'
import { ApiConfigService } from '../src/services/apiConfigService'

const setAccount = (id: string | null) => useUser.setState({ user: id ? { id } as never : null })
beforeEach(() => { setAccount(null); setAccount('alice') })
afterEach(() => vi.unstubAllGlobals())

it('clears territory data and initialization when logging out or switching accounts', () => {
  useApiTerritoryStore.setState({ cache: { territories: [], gpx: 'alice-private-data', lastUpdate: 1 }, loading: false })
  setAccount('bob')
  expect(useApiTerritoryStore.getState().cache).toBeNull()
  expect(useApiTerritoryStore.getState().loading).toBe(true)
  useApiTerritoryStore.setState({ cache: { territories: [], gpx: 'bob-private-data', lastUpdate: 1 }, loading: false })
  setAccount(null)
  expect(useApiTerritoryStore.getState().cache).toBeNull()
})

it('prevents old service instances from issuing writes with a new account cookie', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const territories = new ApiTerritoryService()
  const config = new ApiConfigService()
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  setAccount('bob')
  await expect(territories.saveTerritoryData('alice-data')).rejects.toThrow('Account changed')
  await expect(config.updateUserConfig({ ppp: 200 })).rejects.toThrow('Account changed')
  expect(fetch).not.toHaveBeenCalled()
})

it('ignores old responses even if the transport does not honor cancellation', async () => {
  let respond!: (response: Response) => void
  const fetch = vi.fn((_url: string, options: RequestInit) => {
    expect(options.credentials).toBe('include')
    return new Promise<Response>(resolve => { respond = resolve })
  })
  vi.stubGlobal('fetch', fetch)
  const pending = useApiTerritoryStore.getState().initialize()
  const signal = fetch.mock.calls[0][1].signal!
  setAccount('bob')
  expect(signal.aborted).toBe(true)
  respond(Response.json({ success: true, data: { data: 'alice-data' } }))
  await pending
  expect(useApiTerritoryStore.getState().cache).toBeNull()
  expect(useApiTerritoryStore.getState().loading).toBe(true)
  expect(fetch).toHaveBeenCalledTimes(1)
})

it('loads the new account after an account switch', async () => {
  setAccount('bob')
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json({ success: true, data: { data: 'bob-data' } }))
    .mockResolvedValueOnce(Response.json({ success: true, territories: [] }))
  vi.stubGlobal('fetch', fetch)
  await useApiTerritoryStore.getState().initialize()
  expect(useApiTerritoryStore.getState().cache?.gpx).toBe('bob-data')
  expect(useApiTerritoryStore.getState().loading).toBe(false)
})

it('serializes renames against the latest GPX and keeps cache unchanged on failure', async () => {
  const polygon = [{ lat: 48, lon: 2 }, { lat: 49, lon: 2 }, { lat: 48, lon: 3 }]
  useApiTerritoryStore.setState({ cache: { territories: [{ num: '1', name: 'Old', polygon }, { num: '2', name: 'Old', polygon }], gpx: '', lastUpdate: 1 }, loading: false })
  const save = vi.spyOn(ApiTerritoryService.prototype, 'saveTerritoryData').mockResolvedValue({ success: true })
  await Promise.all([useApiTerritoryStore.getState().renameTerritory('1', 'First'), useApiTerritoryStore.getState().renameTerritory('2', 'Second')])
  expect(save).toHaveBeenCalledTimes(2)
  expect(save.mock.calls[1][0]).toContain('1 - First')
  expect(save.mock.calls[1][0]).toContain('2 - Second')
  save.mockRejectedValueOnce(new Error('Offline'))
  await expect(useApiTerritoryStore.getState().renameTerritory('1', 'Failed')).rejects.toThrow('Offline')
  expect(useApiTerritoryStore.getState().cache?.territories[0].name).toBe('First')
})
