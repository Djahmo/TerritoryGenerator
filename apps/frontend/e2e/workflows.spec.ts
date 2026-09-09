import { test, expect, type Page } from '@playwright/test'
import JSZip from 'jszip'
import { readFile } from 'node:fs/promises'
import { makeGpx } from '../src/utils/territoryFiles'
import { setup } from './fixtures'

const polygon = [{ lat: 48, lon: 2 }, { lat: 49, lon: 2 }, { lat: 48, lon: 3 }]
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

const sameCsv = { name: 'territoires.csv', mimeType: 'text/csv', buffer: Buffer.from('Category,Number,Suffix,Boundary\nCentre,1,,"[[2,48],[2,49],[3,48]]"\nSud,2,,"[[2,48],[2,49],[3,48]]"') }
const generatedFormats = (state: Awaited<ReturnType<typeof setup>>) => state.writes.filter(write => write.url === '/api/generate-image').map(write => `${(write.body.territory as { num: string }).num}:${write.body.imageType}`)

test('reimporting the same CSV regenerates every standard image and existing large plan each time', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/')
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole('button', { name: /Re téléverser/ }).click()
    await expect(page.getByRole('checkbox', { name: 'Régénérer toutes les cartes' })).toBeChecked()
    page.once('dialog', dialog => { expect(dialog.message()).toContain('annotations'); return dialog.accept() })
    await page.locator('input[type=file]').setInputFiles(sameCsv)
    await expect.poll(() => generatedFormats(state)).toEqual(Array.from({ length: attempt + 1 }, () => ['1:standard', '1:large', '2:standard']).flat())
    await expect(page.getByRole('button', { name: /Re téléverser/ })).toBeVisible()
  }
})

test('unchecked regeneration preserves complete images on CSV reimport', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/')
  await page.getByRole('button', { name: /Re téléverser/ }).click()
  await page.getByRole('checkbox', { name: 'Régénérer toutes les cartes' }).uncheck()
  await page.locator('input[type=file]').setInputFiles(sameCsv)
  await expect.poll(() => state.writes.map(write => write.url)).toEqual(['/api/data'])
  await expect(page.getByRole('button', { name: /Re téléverser/ })).toBeVisible()
})

test('canceling regeneration leaves the imported data and images untouched', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/')
  await page.getByRole('button', { name: /Re téléverser/ }).click()
  const confirmation = page.waitForEvent('dialog')
  await page.locator('input[type=file]').setInputFiles(sameCsv)
  await (await confirmation).dismiss()
  await expect(page.getByRole('button', { name: /Re téléverser/ })).toBeVisible()
  expect(state.writes).toEqual([])
})

test('a failed image does not skip the rest of the CSV and retains only its draft', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/territory/1')
  await draw(page)
  await page.getByRole('button', { name: 'Plan large', exact: true }).click()
  await draw(page)
  page.once('dialog', dialog => dialog.accept())
  await page.goto('/')
  await page.route('**/api/generate-image', async route => {
    const body = route.request().postDataJSON()
    if (body.territory.num === '1' && body.imageType === 'standard') {
      state.writes.push({ url: '/api/generate-image', body })
      return route.fulfill({ status: 503, json: { error: 'IGN unavailable' } })
    }
    return route.fallback()
  })
  await page.getByRole('button', { name: /Re téléverser/ }).click()
  page.once('dialog', dialog => dialog.accept())
  await page.locator('input[type=file]').setInputFiles(sameCsv)
  await expect(page.getByRole('alert')).toContainText('1 (serré)')
  expect(generatedFormats(state)).toEqual(['1:standard', '1:large', '2:standard'])
  expect(Object.keys(await drafts(page))).toEqual([JSON.stringify(['alice', '1', false])])
})
