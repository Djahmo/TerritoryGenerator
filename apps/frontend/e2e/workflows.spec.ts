import { test, expect, type Page } from '@playwright/test'
import JSZip from 'jszip'
import { readFile } from 'node:fs/promises'
import { makeGpx } from '../src/utils/territoryFiles'

const polygon = [{ lat: 48, lon: 2 }, { lat: 49, lon: 2 }, { lat: 48, lon: 3 }]
async function setup(page: Page) {
  const state = { writes: [] as { url: string; body: Record<string, unknown> }[], failSave: false }
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (route.request().method() !== 'GET') {
      state.writes.push({ url: path, body: route.request().postDataJSON() })
      return route.fulfill({ status: state.failSave ? 500 : 200, json: state.failSave ? { error: 'Offline' } : { success: true } })
    }
    if (path === '/api/me') return route.fulfill({ json: { id: 'alice', username: 'Alice', email: 'alice@example.test', emailVerified: '2025-01-01' } })
    if (path === '/api/user-config') return route.fulfill({ json: { success: true, config: { contourColor: '#000', palette: ['#000000'], ppp: 300, ratioX: 1, ratioY: 1.41 } } })
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
async function draw(page: Page) {
  const canvas = page.locator('[data-testid="paint"] canvas')
  await expect(page.getByRole('button', { name: 'Sauvegarder', exact: true })).toBeEnabled()
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + 100, box.y + 100)
  await page.mouse.down()
  await page.mouse.move(box.x + 180, box.y + 180, { steps: 8 })
  await page.mouse.up()
  await expect(page.getByRole('button', { name: 'Sauvegarder les modifications' })).toBeVisible()
}
async function drafts(page: Page) {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem('territory-drawing-drafts')!).state.drafts)
}

test('keeps format drafts across navigation and reload, preserves failed saves', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/territory/1')
  await draw(page)
  const initial = await drafts(page)
  await page.getByRole('button', { name: 'Plan large', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sauvegarder', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Plan serré', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sauvegarder les modifications' })).toBeVisible()
  expect(await drafts(page)).toEqual(initial)
  page.on('dialog', dialog => dialog.accept())
  await page.reload()
  await expect(page.getByRole('button', { name: 'Sauvegarder les modifications' })).toBeEnabled()
  state.failSave = true
  await page.getByRole('button', { name: 'Sauvegarder les modifications' }).click()
  await expect(page.getByText('Échec de la sauvegarde. Votre brouillon est conservé.')).toBeVisible()
  expect(await drafts(page)).toEqual(initial)
  state.failSave = false
  await page.getByRole('button', { name: 'Sauvegarder les modifications' }).click()
  await expect(page.getByText('Dessin sauvegardé', { exact: true })).toBeVisible()
  expect(await drafts(page)).toEqual({})
  const body = state.writes.at(-1)!.body as { layers: { paintLayersImage: { id: string }[] } }
  expect(body.layers.paintLayersImage[0].id).toBe(Object.values(initial)[0].layers[0].id)
})

test('undo starts at restored document and ignores typing in the name field', async ({ page }) => {
  await setup(page)
  await page.goto('/territory/1')
  await draw(page)
  await page.getByRole('button', { name: 'Annuler', exact: true }).click()
  expect(Object.values(await drafts(page))[0].layers).toHaveLength(0)
  await page.getByRole('button', { name: 'Refaire', exact: true }).click()
  expect(Object.values(await drafts(page))[0].layers).toHaveLength(1)
  await page.getByPlaceholder('Nom du territoire').fill('Nouveau nom')
  await page.keyboard.press('Control+z')
  expect(Object.values(await drafts(page))[0].layers).toHaveLength(1)
})

test('touch drawing finishes through pointer capture outside the canvas', async ({ page, context }) => {
  await setup(page)
  await page.goto('/territory/1')
  await expect(page.getByRole('button', { name: 'Sauvegarder', exact: true })).toBeEnabled()
  const box = (await page.locator('[data-testid="paint"] canvas').boundingBox())!
  const cdp = await context.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 60, y: box.y + 60 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width + 20, y: box.y + 140 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(page.getByRole('button', { name: 'Sauvegarder les modifications' })).toBeVisible()
  expect(Object.values(await drafts(page))[0].layers).toHaveLength(1)
})

test('preview uses the landscape print document and HTML ZIP is usable offline', async ({ page, context }) => {
  await setup(page)
  await page.goto('/exportation')
  await page.getByRole('button', { name: 'Aperçu large', exact: true }).click()
  const frame = page.frameLocator('iframe')
  await expect(frame.locator('.sheet.landscape')).toBeVisible()
  await expect(frame.locator('.name')).toHaveText('Centre <script>bad()</script>')
  expect(await frame.locator('.sheet').evaluate(el => el.getBoundingClientRect().width > el.getBoundingClientRect().height)).toBe(true)
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Télécharger fichiers d’impression' }).click()
  const archive = await JSZip.loadAsync(await readFile((await (await downloaded).path())!))
  const html = await archive.file('tous_les_territoires.html')!.async('string')
  expect(html).not.toContain('/api/')
  expect(html).toContain('sheet portrait')
  expect(html).toContain('sheet landscape')
  await context.setOffline(true)
  const offlinePage = await context.newPage()
  await offlinePage.setContent(html)
  expect(await offlinePage.locator('img').evaluateAll(images => images.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true)
  await offlinePage.emulateMedia({ media: 'print' })
  const pdf = await offlinePage.pdf({ preferCSSPageSize: true })
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
  const boxes = [...pdf.toString('latin1').matchAll(/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/g)]
  expect(boxes).toHaveLength(2)
  expect(boxes.map(box => Number(box[1]) > Number(box[2]))).toEqual([false, true])
})

test('an empty import reports an error and allows another file', async ({ page }) => {
  await setup(page)
  await page.goto('/')
  await page.getByRole('button', { name: /Re téléverser/ }).click()
  await page.locator('input[type=file]').setInputFiles({ name: 'empty.gpx', mimeType: 'application/xml', buffer: Buffer.from('') })
  await expect(page.getByRole('alert')).toHaveText('Le fichier est vide.')
  await expect(page.locator('input[type=file]')).toBeAttached()
})

test('regeneration confirms annotation removal and keeps the other format draft', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/territory/1')
  await draw(page)
  const standard = await drafts(page)
  await page.getByRole('button', { name: 'Plan large', exact: true }).click()
  await draw(page)
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('button', { name: 'Régénérer le plan large', exact: true }).click()
  expect(state.writes).toHaveLength(0)
  expect(Object.keys(await drafts(page))).toHaveLength(2)
  page.once('dialog', dialog => { expect(dialog.message()).toContain('supprimera'); return dialog.accept() })
  await page.getByRole('button', { name: 'Régénérer le plan large', exact: true }).click()
  await expect(page.getByText('Fond de carte mis à jour', { exact: true })).toBeVisible()
  expect(await drafts(page)).toEqual(standard)
})
