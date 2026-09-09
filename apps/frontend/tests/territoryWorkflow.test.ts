import { describe, expect, it, vi } from 'vitest'
import { csvRows, parse, parseCsv, makeGpx, parseGpx } from '../src/utils/territoryFiles'
import { LayerService } from '../src/services/layerService'
import type { PaintLayer } from '../src/utils/types'
import { createPrintHTML, preparePrintPages } from '../src/services/printService'
import { addImageTimestamp } from '../src/utils'
import { parseGpx as backendParseGpx } from '../../backend/src/utils/gpxParser'
import { decodeLayer, encodeLayerData, layerOrder } from '../../backend/src/utils/layerDocument'

const polygon = [{ lat: 48, lon: 2 }, { lat: 49, lon: 2 }, { lat: 48, lon: 3 }]
const territory = { num: 'A01', name: 'Église & gare <Nord> - Centre', polygon }

describe('territory files', () => {
  it('round trips escaped names without truncating separators on both front and backend', () => {
    const gpx = makeGpx([territory])
    expect(gpx).toContain('&amp;')
    expect(parse(gpx, 'application/xml')).toEqual([territory])
    expect(backendParseGpx(gpx)[0]).toMatchObject(territory)
  })
  it('handles CSV commas, double quotes and multiline fields', () => {
    expect(csvRows('a,"b,c","d""e"\r\n1,"two\nlines",3')).toEqual([['a', 'b,c', 'd"e'], ['1', 'two\nlines', '3']])
    const csv = 'Category,Number,Suffix,Boundary\n"Église, gare\nNord",01,A,"[[2,48],[2,49],[3,48]]"'
    expect(parseCsv(csv)).toEqual([{ ...territory, name: 'Église, gare\nNord' }])
  })
  it('round trips a territory with no name', () => {
    const gpx = makeGpx([{ ...territory, name: '' }])
    expect(parseGpx(gpx)[0].num).toBe('A01')
    expect(backendParseGpx(gpx)[0].num).toBe('A01')
  })
  it('supports GPX namespace prefixes', () => {
    const gpx = makeGpx([territory]).replace('<gpx ', '<g:gpx xmlns:g="http://www.topografix.com/GPX/1/1" ').replace('</gpx>', '</g:gpx>').replaceAll('<trk>', '<g:trk>').replaceAll('</trk>', '</g:trk>')
    expect(parseGpx(gpx)).toEqual([territory])
  })
  it.each(['', '<gpx/>', '<gpx><trk>', 'a,"unfinished'])('rejects invalid or empty input %s', value => {
    expect(() => parse(value, '')).toThrow()
  })
  it('rejects duplicates and degenerate polygons before replacing the saved document', () => {
    expect(() => makeGpx([territory, territory])).toThrow(/double/)
    expect(() => makeGpx([{ ...territory, polygon: [polygon[0], polygon[0], polygon[0]] }])).toThrow(/Contour/)
    expect(() => makeGpx([{ ...territory, num: '../escape' }])).toThrow(/Numéro/)
  })
})

const layer: PaintLayer = { id: 'persistent-id', type: 'text', visible: false, locked: true, timestamp: 42, name: 'Repère', style: { color: '#123456', strokeWidth: 2 }, data: { position: { x: 10, y: 20 }, content: 'Gare', fontSize: 18 } }
describe('drawing persistence', () => {
  it('preserves identity, visibility, lock and text size through the editor', () => {
    expect(LayerService.convertDrawObjectToLayer(LayerService.convertLayerToDrawObject(layer)!)).toEqual(layer)
  })
  it('preserves document order independently of SQL row IDs and timestamps', () => {
    const row = { id: 'database-id', layerType: layer.type, layerData: encodeLayerData(layer, 7), style: JSON.stringify(layer.style), visible: false, locked: true, createdAt: new Date(500) }
    expect(layerOrder(row)).toBe(7)
    expect(decodeLayer(row)).toEqual(layer)
    expect(decodeLayer({ ...row, layerData: JSON.stringify(layer.data) }).id).toBe('database-id')
  })
})

describe('print documents', () => {
  it('escapes all names and embeds images with independent orientations', () => {
    const pages = [false, true].map(landscape => ({ num: '"><script>bad</script>', name: '<img onerror="bad"> &', image: 'data:image/png;base64,AAAA', landscape, large: false }))
    const html = createPrintHTML(pages, '<script>bad</script>')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img onerror')
    expect(html).toContain('&lt;img onerror=')
    expect(html).toContain('sheet portrait')
    expect(html).toContain('sheet landscape')
    expect(html).toContain('object-fit:contain')
    expect(html).not.toContain('/api/')
  })
  it('refuses external or active image sources in downloadable HTML', () => {
    expect(() => createPrintHTML([{ ...territory, image: 'javascript:alert(1)', landscape: false, large: false }])).toThrow()
  })
  it.each([401, 404, 500])('rejects HTTP %s instead of exporting an error as PNG', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('error', { status })))
    try { await expect(preparePrintPages([{ ...territory, image: '/api/test.png' }])).rejects.toThrow(String(status)) }
    finally { vi.unstubAllGlobals() }
  })
  it('rejects a successful HTTP response containing HTML', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { headers: { 'Content-Type': 'text/html' } })))
    try { await expect(preparePrintPages([{ ...territory, image: '/api/test.png' }])).rejects.toThrow(/Format/) }
    finally { vi.unstubAllGlobals() }
  })
  it('keeps data and blob URLs intact', () => {
    for (const value of ['data:image/png;base64,AAAA', 'blob:https://local/id']) expect(addImageTimestamp(value)).toBe(value)
  })
})
