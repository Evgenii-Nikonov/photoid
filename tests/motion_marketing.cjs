/* Browser checks for real motion and the Metrika API contract, without sending analytics. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.AUDIT_URL || 'http://127.0.0.1:8080';
const output = process.env.AUDIT_OUTPUT || '.audit';
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    const errors = [];
    const analyticsRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (request.url().includes('mc.yandex.ru/metrika')) analyticsRequests.push(request.url()); });
    await page.route('**/*', async route => {
      const url = route.request().url();
      if (!url.startsWith(base)) return route.abort();
      if (new URL(url).pathname.endsWith('index.html')) {
        const response = await route.fetch();
        const body = (await response.text()).replace(/name="yandex-metrika-id" content="[^"]*"/, 'name="yandex-metrika-id" content=""');
        return route.fulfill({ response, body });
      }
      return route.continue();
    });
    await page.goto(`${base}/index.html?utm_source=ya&utm_medium=cpc&utm_campaign=test&yclid=123#main`, { waitUntil: 'domcontentloaded' });
    assert.equal(new URL(page.url()).searchParams.get('yclid'), '123');
    assert.equal(new URL(page.url()).searchParams.get('utm_source'), 'ya');
    assert.equal(await page.locator('h1').evaluate(element => getComputedStyle(element).opacity), '1');
    await page.waitForFunction(() => document.getAnimations().some(animation => animation.effect.target.closest?.('.hero')));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.getAnimations().length === 0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('#process').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.getAnimations().some(animation => animation.effect.target.matches?.('.process-step')));
    await page.waitForTimeout(800);
    await page.locator('#process').screenshot({ path: path.join(output, 'motion-process-1440.png') });
    await page.locator('#advantages').scrollIntoViewIfNeeded();
    await page.locator('#process').scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.getAnimations().filter(animation => animation.effect.target.matches?.('.process-step')).length), 0);
    await page.locator('.carousel').scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await page.locator('.carousel-item').first().hover();
    await page.waitForTimeout(400);
    assert.notEqual(await page.locator('.carousel-item').first().evaluate(element => getComputedStyle(element).transform), 'none');
    await page.locator('.photo-open').first().click();
    await page.locator('.photo-dialog__image').waitFor({ state: 'visible' });
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => !document.querySelector('.photo-dialog__image').hidden && document.querySelector('.photo-dialog__image').getAnimations().length > 0);
    await page.waitForTimeout(350);
    await page.locator('.photo-dialog').screenshot({ path: path.join(output, 'motion-photo-dialog.png') });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.photo-dialog').evaluate(dialog => dialog.open), false);
    for (const width of [375, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}/index.html`);
      await page.waitForTimeout(850);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: path.join(output, `motion-hero-${width}.png`) });
    }
    assert.deepEqual(analyticsRequests, [], 'No invented counter or analytics requests');
    assert.deepEqual(errors, []);
    await context.close();

    // A browser-only test double verifies the API calls; it is never shipped in site code.
    const tracked = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const trackedPage = await tracked.newPage();
    await trackedPage.addInitScript(() => {
      window.goalCalls = [];
      window.ym = (...args) => window.goalCalls.push(args);
      document.addEventListener('click', event => event.preventDefault(), true);
    });
    await trackedPage.route('**/*', async route => {
      const url = route.request().url();
      if (!url.startsWith(base)) return route.abort();
      if (new URL(url).pathname.endsWith('index.html')) {
        const response = await route.fetch();
        const body = (await response.text()).replace(/name="yandex-metrika-id" content="[^"]*"/, 'name="yandex-metrika-id" content="12345678"');
        return route.fulfill({ response, body });
      }
      return route.continue();
    });
    await trackedPage.goto(`${base}/index.html?utm_source=ya&utm_medium=cpc`);
    const init = await trackedPage.evaluate(() => window.goalCalls[0]);
    assert.equal(init[0], 12345678);
    assert.equal(init[1], 'init');
    assert.equal(init[2].webvisor, false);
    for (const [selector, goal] of [
      ['.header-phone', 'call_click'],
      ['.header__icon[href*="t.me"]', 'telegram_click'],
      ['.header__icon[href*="max.ru"]', 'max_click'],
      ['.map-link', 'map_click'],
      ['a[href="price.html"]', 'price_open'],
      ['.hero__cta a[href="#contacts"]', 'contact_intent']
    ]) {
      await trackedPage.locator(selector).first().evaluate(element => element.click());
      const call = await trackedPage.evaluate(() => window.goalCalls.at(-1));
      assert.deepEqual(call.slice(0, 3), [12345678, 'reachGoal', goal]);
      assert.deepEqual(Object.keys(call[3]), ['placement']);
    }
    await trackedPage.evaluate(() => { window.ym = () => { throw new Error('Simulated unavailable provider'); }; });
    await trackedPage.locator('.header-phone').evaluate(element => element.click());
    assert.equal(await trackedPage.locator('html').getAttribute('data-analytics'), 'unavailable');
    await tracked.close();
    console.log('PASS: actual animations, no delayed heading opacity, one-time sections, reduced-motion cancellation, gallery transitions, 4 viewport screenshots, UTM/yclid, disabled analytics, six goal contracts and provider failure');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
