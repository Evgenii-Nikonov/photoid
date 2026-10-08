/* Optional dev tooling only. See README for installing outside the project. */
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const base = process.env.AUDIT_URL || 'http://127.0.0.1:8080';
const output = process.env.AUDIT_OUTPUT || '.audit';
fs.mkdirSync(output, { recursive: true });
const widths = [320, 375, 768, 1024, 1280, 1440, 1920];

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  const localErrors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) localErrors.push(response.url()); });
  await page.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
  await page.addInitScript(() => {
    window.auditVitals = { lcp: 0, cls: 0 };
    new PerformanceObserver(list => { for (const e of list.getEntries()) window.auditVitals.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.auditVitals.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  const report = { widths, pages: [], scenarios: [] };
  try {
    for (const file of ['index.html', 'price.html']) {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${base}/${file}`);
        await page.waitForTimeout(200);
        assert.equal(await page.locator('h1').count(), 1);
        const overflow = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
        assert.ok(overflow.content <= overflow.viewport, `${file} ${width}px overflow: ${JSON.stringify(overflow)}`);
        const clipped = await page.locator('h1').evaluate(el => el.scrollWidth > el.clientWidth);
        assert.equal(clipped, false, `${file} ${width}px clipped h1`);
        const offscreen = await page.evaluate(() => [...document.querySelectorAll('h1, h2, .price-row, .hero__cta .btn, .contact-card, .price-card, .advantage-card')].filter(el => {
          const r = el.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1);
        }).map(el => el.className));
        assert.deepEqual(offscreen, [], `${file} ${width}px offscreen content`);
        if (width === 1440) {
          await page.waitForTimeout(2000);
          const vitals = await page.evaluate(() => ({ ...window.auditVitals, bytes: performance.getEntriesByType('resource').reduce((sum, r) => sum + r.transferSize, 0) }));
          const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
          report.pages.push({ file, vitals, axe: axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) });
          assert.deepEqual(axe.violations.map(v => v.id), [], `${file} accessibility findings`);
        }
        // Walk the entire page: test scrolling, decode lazy images and capture actual content.
        await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < height; y += 700) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(35); }
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: path.join(output, `after-${file}-${width}.png`), fullPage: true });
        const broken = await page.locator('img').evaluateAll(async images => {
          const results = await Promise.all(images.filter(img => img.getAttribute('src')).map(async img => {
            img.loading = 'eager';
            try { await img.decode(); return null; } catch { return img.src; }
          }));
          return results.filter(Boolean);
        });
        assert.deepEqual(broken, [], `${file} broken images`);
      }
    }
    for (const file of ['index.html', 'price.html']) {
      await page.goto(`${base}/${file}`);
      for (const width of [360, 414, 600, 601, 767, 900, 901, 1199, 1200, 1600]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${file}: ${width}px boundary overflow`);
      }
    }
    report.scenarios.push('intermediate widths and both sides of responsive breakpoints');

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${base}/index.html`);
    const burger = page.locator('#burger');
    await burger.click();
    assert.equal(await burger.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('main').evaluate(el => el.inert), true);
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('#main-nav a')), true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await burger.evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('#main-nav a')), true);
    await page.screenshot({ path: path.join(output, 'menu-mobile.png') });
    const axeMenu = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    assert.deepEqual(axeMenu.violations.map(v => v.id), [], 'menu accessibility');
    await page.keyboard.press('Escape');
    assert.equal(await burger.getAttribute('aria-expanded'), 'false');
    assert.equal(await burger.evaluate(el => el === document.activeElement), true);
    assert.equal(await page.locator('main').evaluate(el => el.inert), false);
    await burger.click();
    await burger.click();
    assert.equal(await burger.getAttribute('aria-expanded'), 'false');
    await burger.click();
    await page.locator('#nav-overlay').click({ position: { x: 10, y: 400 } });
    assert.equal(await burger.getAttribute('aria-expanded'), 'false');
    await burger.click();
    await page.locator('#main-nav a[href="#examples"]').click();
    assert.equal(await burger.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('#examples').evaluate(el => el === document.activeElement), true);
    await burger.click();
    await page.setViewportSize({ width: 1440, height: 900 });
    assert.equal(await page.locator('#main-nav').evaluate(el => el.inert), false);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    report.scenarios.push('menu: Tab loop, Escape, overlay, anchor focus, resize');

    const faq = page.locator('.accordion-header');
    await faq.first().focus();
    await page.keyboard.press('Enter');
    assert.equal(await faq.first().getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('.accordion-content').first().evaluate(el => el.hidden), false);
    await faq.nth(1).focus();
    await page.keyboard.press('Space');
    assert.equal(await faq.first().getAttribute('aria-expanded'), 'false');
    assert.equal(await faq.nth(1).getAttribute('aria-expanded'), 'true');
    await page.locator('.accordion-content').nth(1).evaluate(el => { el.querySelector('p').textContent = 'Длинный ответ для проверки переноса и высоты. '.repeat(50); });
    assert.equal(await page.locator('.accordion-content').nth(1).evaluate(el => el.scrollHeight <= el.clientHeight + 1), true);
    await faq.nth(1).click();
    assert.equal(await page.locator('.accordion-content').nth(1).evaluate(el => el.hidden), true);
    report.scenarios.push('FAQ: Enter, Space, one open answer, long content, collapse');

    const slider = page.locator('.slider-line');
    await slider.focus();
    await page.keyboard.press('Home');
    assert.equal(await slider.getAttribute('aria-valuenow'), '0');
    await page.keyboard.press('ArrowRight');
    assert.equal(await slider.getAttribute('aria-valuenow'), '5');
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await slider.getAttribute('aria-valuenow'), '95');
    const comparison = await page.locator('.compare-container').boundingBox();
    await page.mouse.move(comparison.x + comparison.width * .5, comparison.y + comparison.height * .5);
    await page.mouse.down();
    await page.mouse.move(comparison.x + comparison.width * .2, comparison.y + comparison.height * .5);
    await page.mouse.up();
    assert.ok(Number(await slider.getAttribute('aria-valuenow')) >= 19 && Number(await slider.getAttribute('aria-valuenow')) <= 21);
    report.scenarios.push('comparison: 0 boundary regression, Home/End, arrows, pointer drag');

    await page.locator('.carousel').scrollIntoViewIfNeeded();
    await page.locator('.arrow.right').click();
    assert.ok(await page.locator('.carousel-track-wrapper').evaluate(el => el.scrollLeft > 0));
    await page.locator('.carousel-track-wrapper').focus();
    await page.keyboard.press('ArrowLeft');
    assert.ok(await page.locator('.carousel-track-wrapper').evaluate(el => el.scrollLeft < 2));
    assert.equal(await page.locator('.carousel-item').count(), 8);
    const galleryBox = await page.locator('.carousel-track-wrapper').boundingBox();
    await page.mouse.move(galleryBox.x + galleryBox.width * .7, galleryBox.y + 150);
    await page.mouse.down();
    await page.mouse.move(galleryBox.x + galleryBox.width * .25, galleryBox.y + 150, { steps: 12 });
    await page.mouse.up();
    assert.ok(await page.locator('.carousel-track-wrapper').evaluate(el => el.scrollLeft > 0));
    assert.equal(await page.locator('.photo-dialog').evaluate(el => el.open), false);
    report.scenarios.push('gallery: next, previous keyboard, mouse drag, counter/progress, no clones');

    const firstPhoto = page.locator('.photo-open').first();
    await firstPhoto.focus();
    await page.keyboard.press('Enter');
    await page.locator('.photo-dialog__image').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.photo-dialog').evaluate(el => el.open), true);
    assert.equal(await page.locator('.photo-dialog__close').evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('ArrowRight');
    assert.match(await page.locator('.photo-dialog__count').innerText(), /02/);
    await page.locator('.photo-dialog__image').waitFor({ state: 'visible' });
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.locator('.photo-dialog').evaluate(el => el.scrollWidth <= el.clientWidth), true, `dialog overflow at ${width}`);
      const contained = await page.locator('.photo-dialog__image').evaluate(image => {
        const photo = image.getBoundingClientRect();
        const wrap = image.parentElement.getBoundingClientRect();
        return photo.height > 0 && photo.top >= wrap.top - 1 && photo.bottom <= wrap.bottom + 1 && photo.left >= wrap.left - 1 && photo.right <= wrap.right + 1;
      });
      assert.equal(contained, true, `whole photo must fit its frame at ${width}`);
      assert.equal(await page.locator('.photo-dialog').evaluate(el => el.scrollHeight <= el.clientHeight + 1), true, `dialog controls must not be covered at ${width}`);
      await page.screenshot({ path: path.join(output, `photo-dialog-${width}.png`) });
    }
    const axeDialog = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    assert.deepEqual(axeDialog.violations.map(v => v.id), [], 'photo dialog accessibility');
    await page.keyboard.press('Escape');
    assert.equal(await firstPhoto.evaluate(el => el === document.activeElement), true);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    await page.route('**/example-8-960.webp', route => route.abort());
    await page.locator('.photo-open').last().click();
    await page.waitForFunction(() => document.querySelector('.photo-dialog__status').textContent.includes('не удалось'));
    await page.locator('.photo-dialog__prev').click();
    await page.locator('.photo-dialog__image').waitFor({ state: 'visible' });
    await page.locator('.photo-dialog__close').click();
    report.scenarios.push('photo dialog: keyboard open, arrows, whole image and controls fit at all widths, Escape/focus return, image error/recovery');

    await page.locator('#reviews').scrollIntoViewIfNeeded();
    await page.locator('#reviews-retry').waitFor({ state: 'visible' });
    assert.match(await page.locator('#reviews-message').innerText(), /не загрузились/);
    await page.locator('#reviews-retry').click();
    await page.locator('#reviews-retry').waitFor({ state: 'visible' });
    report.scenarios.push('reviews: network failure and retry');

    assert.equal(await page.locator('.pricing__bg-video source').getAttribute('src'), null);
    await page.route('**/studio-bg.mp4', route => route.abort());
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('#pricing').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.pricing__bg-video').dataset.state === 'fallback');
    assert.equal(await page.locator('.pricing__bg-video').evaluate(el => el.paused), true);
    assert.equal(await page.locator('.video-toggle').count(), 0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    report.scenarios.push('video: no initial download, reduced-motion pause, error poster, no playback button');

    await page.locator('a[href="price.html"]').first().click();
    await page.waitForURL('**/price.html');
    await page.locator('.price-categories a[href="#scan"]').click();
    assert.ok(await page.locator('#scan').evaluate(el => el.getBoundingClientRect().top >= 75));
    await page.locator('.back-link').click();
    await page.waitForURL('**/index.html');
    assert.equal(await page.locator('.contact-card .btn').getAttribute('href'), 'tel:+79234968231');
    report.scenarios.push('navigation: full price, back home, real contact action');

    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
    const fallback = await noJs.newPage();
    await fallback.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
    await fallback.goto(`${base}/index.html`);
    assert.equal(await fallback.locator('#main-nav a').first().isVisible(), true);
    assert.equal(await fallback.locator('.accordion-content').first().isVisible(), true);
    assert.equal(await fallback.locator('#reviews-retry').isVisible(), false);
    await fallback.screenshot({ path: path.join(output, 'no-js-mobile.png'), fullPage: true });
    await noJs.close();
    report.scenarios.push('no JavaScript: navigation, prices, FAQ and contacts remain available');
    const touch = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
    const touchPage = await touch.newPage();
    await touchPage.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
    await touchPage.goto(`${base}/index.html`);
    await touchPage.locator('#burger').tap();
    await touchPage.locator('#burger').tap();
    assert.equal(await touchPage.locator('#burger').getAttribute('aria-expanded'), 'false');
    await touchPage.locator('.compare-container').tap({ position: { x: 70, y: 70 } });
    assert.ok(Number(await touchPage.locator('.slider-line').getAttribute('aria-valuenow')) < 30);
    await touch.close();
    report.scenarios.push('touch emulation: menu and photo comparison');
    assert.deepEqual(errors, [], 'uncaught JavaScript exceptions');
    assert.deepEqual(localErrors, [], 'local HTTP errors');
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
