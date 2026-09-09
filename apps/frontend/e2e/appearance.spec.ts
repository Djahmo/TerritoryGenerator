import { test, expect, type Page } from '@playwright/test'
import { setup } from './fixtures'

async function ready(page: Page) {
  await expect(page.locator('h1')).toBeVisible()
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode().catch(() => {}))) })
}
async function noOverflow(page: Page) {
  expect(await page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  const section = page.locator('.page')
  const overflow = await section.evaluate(el => [...el.querySelectorAll('*')].filter(node => node.getBoundingClientRect().right > el.getBoundingClientRect().right + 1).map(node => ({ tag: node.tagName, cls: node.className, width: node.getBoundingClientRect().width })))
  expect(await section.evaluate(el => el.scrollWidth <= el.clientWidth), JSON.stringify(overflow)).toBe(true)
}

test('gallery search, keyboard rename, active navigation and persistent theme', async ({ page }, info) => {
  await page.addInitScript(() => { localStorage.setItem('i18nextLng', 'fr') })
  const state = await setup(page)
  await page.goto('/territories')
  await ready(page)
  await expect(page.locator('.territory-card')).toHaveCount(2)
  await expect(page.getByRole('navigation').getByRole('link', { name: /Mes territoires/ })).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('.card-preview img').first()).toBeVisible()
  await page.screenshot({ animations: 'disabled', path: info.outputPath('gallery-desktop.png') })
  await page.getByPlaceholder('Nom ou numéro du territoire').fill('introuvable')
  await expect(page.getByRole('heading', { name: 'Aucun territoire trouvé' })).toBeVisible()
  await page.getByRole('button', { name: 'Effacer la recherche' }).click()
  await page.getByRole('button', { name: 'Renommer le territoire 2' }).click()
  await page.getByRole('textbox', { name: 'Nom du territoire 2', exact: true }).fill('Quartier sud')
  await page.keyboard.press('Enter')
  await expect(page.locator('.card-title-row').filter({ hasText: 'Quartier sud' })).toBeVisible()
  expect(state.writes.some(write => JSON.stringify(write.body).includes('Quartier sud'))).toBe(true)
  await page.getByRole('button', { name: 'Activer le thème sombre' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.reload()
  await ready(page)
  await expect(page.getByRole('button', { name: 'Activer le thème clair' })).toBeVisible()
  await page.screenshot({ animations: 'disabled', path: info.outputPath('gallery-dark.png') })
  await noOverflow(page)
})

test('mobile pages keep the canvas usable and all actions reachable', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => { localStorage.setItem('i18nextLng', 'fr') })
  await setup(page)
  for (const [name, path] of [['gallery', '/territories'], ['editor', '/territory/1'], ['export', '/exportation'], ['settings', '/configuration'], ['map', '/']] as const) {
    await page.goto(path)
    await ready(page)
    await noOverflow(page)
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()
    if (name === 'editor') {
      const canvas = page.locator('[data-testid="paint"] canvas')
      await expect(page.getByRole('button', { name: 'Sauvegarder', exact: true })).toBeEnabled()
      const box = (await canvas.boundingBox())!
      expect(box.width).toBeGreaterThan(320)
      const tools = (await page.locator('.paint-sidebar').boundingBox())!
      expect(tools.y).toBeGreaterThanOrEqual(box.y + box.height - 1)
      await page.getByRole('button', { name: 'Sauvegarder', exact: true }).scrollIntoViewIfNeeded()
      await expect(page.getByRole('button', { name: 'Sauvegarder', exact: true })).toBeInViewport()
      await page.locator('.page').evaluate(el => { el.scrollTop = 0 })
    }
    await page.screenshot({ animations: 'disabled', path: info.outputPath(`${name}-mobile.png`) })
  }
  const upload = page.getByRole('button', { name: 'Re téléverser mes territoires' })
  await upload.click()
  const modal = page.getByRole('dialog', { name: 'Importer des territoires' })
  await expect(modal).toBeVisible()
  await page.screenshot({ animations: 'disabled', path: info.outputPath('import-mobile.png') })
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('Tab')
    // Tab may enter browser chrome, but must never reach background controls.
    expect(await modal.evaluate(el => el.contains(document.activeElement) || document.activeElement === document.body)).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(modal).not.toBeVisible()
  await expect(upload).toBeFocused()
})

test('desktop editor, export and settings fit in both themes', async ({ page }, info) => {
  await page.addInitScript(() => { localStorage.setItem('i18nextLng', 'fr') })
  await setup(page)
  for (const [name, path] of [['editor', '/territory/1'], ['export', '/exportation'], ['settings', '/configuration'], ['map', '/']] as const) {
    await page.goto(path)
    await ready(page)
    if (name === 'editor') await expect(page.getByRole('button', { name: 'Sauvegarder', exact: true })).toBeEnabled()
    await noOverflow(page)
    await page.screenshot({ animations: 'disabled', path: info.outputPath(`${name}-desktop.png`) })
    await page.getByRole('button', { name: 'Activer le thème sombre' }).click()
    await page.screenshot({ animations: 'disabled', path: info.outputPath(`${name}-dark.png`) })
    await page.getByRole('button', { name: 'Activer le thème clair' }).click()
  }
})

test('account form is keyboard accessible on mobile and submits the selected mode', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => { localStorage.setItem('i18nextLng', 'fr') })
  const state = await setup(page)
  await page.route('**/api/me', route => route.fulfill({ status: 401, json: {} }))
  await page.route('**/api/user-config', route => route.fulfill({ status: 401, json: {} }))
  await page.goto('/configuration')
  await page.getByRole('button', { name: 'Me connecter', exact: true }).click()
  const modal = page.getByRole('dialog')
  await expect(modal).toBeVisible()
  await page.screenshot({ animations: 'disabled', path: info.outputPath('login-mobile.png') })
  await modal.getByRole('button', { name: 'Créer un compte', exact: true }).click()
  await expect(modal.getByRole('textbox', { name: /utilisateur/ })).toBeVisible()
  await modal.getByRole('group', { name: 'Accès au compte' }).getByRole('button', { name: 'Me connecter', exact: true }).click()
  await modal.getByRole('textbox', { name: /mail/i }).fill('alice@example.test')
  await modal.getByLabel('Mot de passe', { exact: true }).fill('Example123!')
  await page.keyboard.press('Enter')
  await expect.poll(() => state.writes.filter(write => write.url === '/api/auth/login').length).toBe(1)
})

for (const width of [320, 1024]) {
  test(`pages remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await setup(page)
    for (const path of ['/territories', '/territory/1', '/exportation', '/configuration', '/']) {
      await page.goto(path)
      await ready(page)
      await noOverflow(page)
    }
  })
}
