import type { Page } from '@playwright/test'
import { makeGpx } from '../src/utils/territoryFiles'
const polygon = [{ lat: 48, lon: 2 }, { lat: 49, lon: 2 }, { lat: 48, lon: 3 }]
export async function setup(page: Page) {
  const state = { writes: [] as { url: string; body: Record<string, unknown> }[], failSave: false }
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (route.request().method() !== 'GET') {
      state.writes.push({ url: path, body: route.request().postDataJSON() })
      return route.fulfill({ status: state.failSave ? 500 : 200, json: state.failSave ? { error: 'Offline' } : { success: true } })
    }
    if (path === '/api/me') return route.fulfill({ json: { id: 'alice', username: 'Alice', email: 'alice@example.test', emailVerified: '2025-01-01' } })
    if (path === '/api/user-config') return route.fulfill({ json: { success: true, config: { contourColor: '#000', palette: ['#000000'], ppp: 300, ratioX: 1, ratioY: 1.41, largeRatioX: 1.41, largeRatioY: 1, largeFactor: 0.7, contourWidth: 3, thumbnailWidth: 360, networkRetries: 3, networkDelay: 1000, ignApiRateLimit: 5, ignApiBaseUrl: 'https://data.geopf.fr/wms-r', ignApiLayer: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', ignApiFormat: 'image/png', ignApiCRS: 'EPSG:3857' } } })
    if (path === '/api/data') return route.fulfill({ json: { success: true, data: { data: makeGpx([{ num: '1', name: 'Centre', polygon }, { num: '2', name: 'Sud', polygon }]) } } })
    if (path === '/api/territories') {
      // Generate real raster fixtures in the browser, without native canvas dependencies.
      const image = await page.evaluate(() => {
        const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 800
        const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 600, 800)
        return canvas.toDataURL()
      })
      const wide = await page.evaluate(() => {
        const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 500
        const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#eee'; ctx.fillRect(0, 0, 800, 500)
        return canvas.toDataURL()
      })
      return route.fulfill({ json: { success: true, territories: [
        { num: '1', name: 'Centre <script>bad()</script>', polygon, original: image, image, miniature: image, originalLarge: wide, large: wide, paintLayersImage: [], paintLayersLarge: [] },
        { num: '2', name: 'Sud', polygon, original: wide, image: wide, miniature: wide, paintLayersImage: [], paintLayersLarge: [] },
      ] } })
    }
    return route.fulfill({ status: 404, json: {} })
  })
  await page.route('**/tiles/**', route => route.abort())
  return state
}
