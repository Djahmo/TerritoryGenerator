import { afterEach, describe, expect, it, vi } from 'vitest'
import { getImageFileName, resolveImagePath, territoryNumberSchema } from '../src/lib/secure/imagePaths.js'
import { fetchWithRetry, buildIgnUrl } from '../src/utils/network.js'

afterEach(() => vi.unstubAllGlobals())

describe('Image paths', () => {
  it.each(['../other/42', '..\\other\\42', '/', '.', '..', '42\0', '42\n'])('rejects %j', number => {
    expect(territoryNumberSchema.safeParse(number).success).toBe(false)
    expect(() => resolveImagePath('/tmp/images', 'a'.repeat(21), number, 'standard')).toThrow()
  })
  it('preserves safe existing names and encodes no filesystem separators', () => {
    expect(getImageFileName('Été #42', 'standard')).toBe('Été #42-standard.png')
    expect(resolveImagePath('/tmp/images', 'a'.repeat(21), 'A01', 'standard'))
      .toBe(`/tmp/images/${'a'.repeat(21)}/A01-standard.png`)
    expect(() => getImageFileName('42', '../other')).toThrow()
    expect(() => resolveImagePath('/tmp/images', '../other', '42', 'standard')).toThrow()
  })
})

describe('IGN network boundary', () => {
  it.each([
    'http://127.0.0.1/admin', 'http://169.254.169.254/latest/meta-data',
    'https://data.geopf.fr.evil.example/wms-r', 'https://data.geopf.fr@evil.example/wms-r',
    'https://data.geopf.fr:8443/wms-r', 'https://data.geopf.fr/redirect',
    'https://user:password@data.geopf.fr/wms-r', 'file:///etc/passwd',
  ])('rejects untrusted destination %s before fetching', async url => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await expect(fetchWithRetry(url, 1)).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
    expect(() => buildIgnUrl([0, 0, 1, 1], 100, { baseUrl: url })).toThrow()
  })
  it('allows IGN and refuses redirects with a bounded timeout', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('image'))
    vi.stubGlobal('fetch', fetch)
    const url = buildIgnUrl([0, 0, 1, 1], 100)
    await fetchWithRetry(url, 1)
    expect(fetch).toHaveBeenCalledWith(url, { redirect: 'error', signal: expect.any(AbortSignal) })
  })
})
