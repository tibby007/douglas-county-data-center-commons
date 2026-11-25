import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const origin = 'http://127.0.0.1:4183'
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4183', '--strictPort'], { stdio: 'inherit' })
const shots = process.env.DCCC_SCREENSHOTS
const axeSource = resolve('node_modules/axe-core/axe.min.js')
let browser

async function audit(page, label) {
  await page.addScriptTag({ path: axeSource })
  const violations = await page.evaluate(async () => (await window.axe.run({
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  })).violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) })))
  assert.deepEqual(violations, [], label)
}

async function viewportFits(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
}

try {
  if (shots) await mkdir(shots, { recursive: true })
  for (let attempt = 0; ; attempt++) {
    try { await fetch(origin); break } catch (error) {
      if (attempt === 40 || server.exitCode !== null) throw error
      await new Promise(resolve => setTimeout(resolve, 125))
    }
  }
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(origin)
  await page.locator('h1').waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.keyboard.press('Tab')
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Skip to content')
  await page.keyboard.press('Enter')
  assert.equal(await page.evaluate(() => document.activeElement.id), 'main')
  await audit(page, 'desktop browse')
  await page.evaluate(() => document.activeElement.blur())
  if (shots) await page.screenshot({ path: join(shots, '01-browse.png'), fullPage: true })

  const search = page.getByRole('searchbox')
  await search.fill('z2026-56')
  assert.equal(await page.getByRole('status').textContent(), '1 record')
  await search.fill('no such case')
  await page.getByText('No matching records').waitFor()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await page.getByLabel('Record type').selectOption('Zoning agenda')
  await page.getByLabel('Jurisdiction').selectOption('Douglas County, Georgia')
  await page.getByLabel('Verification').selectOption('needs_review')
  assert.equal(await page.getByRole('status').textContent(), '0 records')
  await page.getByLabel('Verification').selectOption('source_matched')
  assert.equal(await page.getByRole('status').textContent(), '1 record')
  await page.getByRole('link', { name: 'View case' }).press('Enter')
  await page.getByRole('heading', { name: 'East Village Dothan, LLC' }).waitFor()
  assert.equal(await page.evaluate(() => document.activeElement.tagName), 'H1')
  await page.getByText('Final decision · Unverified').waitFor()
  await page.getByText('Issued permits · Unknown').waitFor()
  await page.getByText('Measured resource use · Unknown').waitFor()
  await audit(page, 'desktop case')
  await page.evaluate(() => document.activeElement.blur())
  if (shots) await page.screenshot({ path: join(shots, '02-case.png'), fullPage: true })
  const open = page.getByRole('button', { name: 'View evidence' })
  await open.press('Enter')
  const drawer = page.getByRole('dialog')
  await drawer.waitFor()
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Close evidence')
  assert.equal(await drawer.getByRole('link', { name: 'Open original PDF' }).getAttribute('href'),
    'https://douglascountyga.gov/DocumentCenter/View/14622/DRAFT-7-7-2026-Zoning-Agenda#page=1')
  await drawer.getByText('Jun 2, 2026').waitFor()
  await drawer.getByText('Jul 7, 2026').waitFor()
  await audit(page, 'desktop evidence dialog')
  if (shots) await page.screenshot({ path: join(shots, '03-evidence.png') })
  await page.keyboard.press('Escape')
  await drawer.waitFor({ state: 'hidden' })
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'View evidence ')

  await page.getByRole('navigation').getByRole('link', { name: 'Data' }).click()
  await page.getByRole('heading', { name: 'Download the index' }).waitFor()
  for (const format of ['CSV', 'JSON']) {
    const [download] = await Promise.all([
      page.waitForEvent('download'), page.getByRole('button', { name: format, exact: true }).click(),
    ])
    assert.ok(download.suggestedFilename().endsWith('.' + format.toLowerCase()))
    const exported = await readFile(await download.path(), 'utf8')
    assert.match(exported, /2026-11-23/)
    assert.match(exported, /DRAFT-7-7-2026-Zoning-Agenda/)
  }
  await page.getByRole('navigation').getByRole('link', { name: 'Method' }).click()
  await page.getByRole('heading', { name: 'Method & coverage' }).waitFor()
  await audit(page, 'desktop method')

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto(origin)
    await page.locator('h1').waitFor()
    await viewportFits(page)
    await audit(page, `browse at ${width}px`)
    if (shots && width === 390) await page.screenshot({ path: join(shots, '04-mobile.png'), fullPage: true })
    await page.getByRole('link', { name: 'View case' }).click()
    await page.getByRole('heading', { name: 'East Village Dothan, LLC' }).waitFor()
    await viewportFits(page)
    await page.getByRole('button', { name: 'View evidence' }).click()
    await drawer.waitFor()
    await viewportFits(page)
    assert.equal(await drawer.evaluate(node => node.scrollWidth <= node.clientWidth), true)
    await audit(page, `evidence at ${width}px`)
    await page.getByRole('button', { name: 'Close evidence' }).click()
  }
  assert.deepEqual(errors, [])

  const offline = await browser.newContext({ offline: true })
  const offlinePage = await offline.newPage()
  const html = await readFile('dist/douglas-county-commons-demo.html', 'utf8')
  const pageUrl = 'https://portable.test/demo.html'
  const fixtureUrl = 'https://portable.test/synthetic.html'
  const onlineRequests = []
  await offline.route('**/*', route => {
    const request = route.request()
    if (request.url() === pageUrl) return route.fulfill({ contentType: 'text/html', body: html })
    if (request.url() === fixtureUrl) return route.fulfill({ contentType: 'text/html', body: fixtureHtml })
    onlineRequests.push(request.url())
    return route.abort()
  })
  await offlinePage.goto(pageUrl)
  await offlinePage.getByRole('heading', { name: 'Data Center Commons.' }).waitFor()
  await offlinePage.getByRole('link', { name: 'View case' }).click()
  await offlinePage.getByRole('heading', { name: 'East Village Dothan, LLC' }).waitFor()
  assert.deepEqual(onlineRequests, [])
  const testText = '<img id="synthetic-html-fixture" src=x onerror="window.fixtureRan=true">'
  const input = 'East Village Dothan, LLC'
  assert.ok(html.includes(input))
  const fixtureHtml = html.replace(input, () => testText.replaceAll('"', '\\"').replaceAll('<', '\\u003c'))
  await offlinePage.goto(fixtureUrl)
  await offlinePage.getByText(testText, { exact: true }).waitFor()
  assert.equal(await offlinePage.locator('#synthetic-html-fixture').count(), 0)
  assert.equal(await offlinePage.evaluate(() => window.fixtureRan), undefined)
  console.log('Chromium checks passed across desktop, 320px, 390px, offline use, downloads, keyboard, axe, and synthetic text escaping.')
} finally {
  await browser?.close()
  server.kill()
}
