/* Optional online smoke check. Requires Internet and the existing provider account. */
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const output = process.env.AUDIT_OUTPUT || '.audit';
  fs.mkdirSync(output, { recursive: true });
  try {
    await page.goto(`${process.env.AUDIT_URL || 'http://127.0.0.1:8080'}/index.html`);
    await page.locator('#reviews').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.sw-app').dataset.swState === 'loaded' && document.querySelector('.sw-review-item'), null, { timeout: 30000 });
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator('#reviews').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      const axe = await new AxeBuilder({ page }).include('#reviews').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      assert.deepEqual(axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), [], `Live widget at ${width}px`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.locator('#reviews').screenshot({ path: path.join(output, `live-reviews-${width}.png`) });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('#contacts').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);
    await page.locator('#contacts').screenshot({ path: path.join(output, 'live-contacts.png') });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('#pricing').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.querySelector('.pricing__bg-video').paused);
    await page.locator('#advantages').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.pricing__bg-video').paused);
    assert.equal(await page.locator('.pricing__bg-video').evaluate(el => el.paused), true);
    await page.locator('#pricing').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.querySelector('.pricing__bg-video').paused);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('.pricing__bg-video').paused);
    assert.deepEqual(errors, []);
    console.log('PASS: real reviews + axe at 375/1440px, no overflow, background autoplay/offscreen pause/resume/reduced motion, no uncaught errors; map screenshot captured');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
