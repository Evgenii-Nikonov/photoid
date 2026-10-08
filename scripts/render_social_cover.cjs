/* Optional asset authoring with the same Playwright used by browser checks. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const asset = (name, type) => `data:${type};base64,${fs.readFileSync(path.join(root, name)).toString('base64')}`;
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html lang="ru"><meta charset="utf-8"><style>
      *{box-sizing:border-box}body{margin:0;background:#f5f8fa;font-family:"Segoe UI",Arial,sans-serif;color:#1d2025}
      main{width:1200px;height:630px;padding:52px 64px;display:grid;grid-template-columns:1fr 330px;gap:52px;align-items:center}
      .logo{width:168px;height:70px;object-fit:contain;margin-bottom:28px}.location{color:#08678d;font-size:18px;letter-spacing:2px}
      h1{font-size:62px;line-height:1.12;letter-spacing:-2px;margin:22px 0}h1 span{color:#08678d}p{font-size:24px;line-height:1.5;margin:18px 0}
      .price{font-size:32px;font-weight:700}.address{font-size:18px;color:#596575}.portrait{height:510px;width:330px;object-fit:contain;object-position:bottom;background:#fff;border:1px solid #dce4ec;border-radius:16px}
      </style><main><div><img class="logo" alt="PHOTO ID" src="${asset('images/logo.svg', 'image/svg+xml')}"><div class="location">ФОТОСТУДИЯ В НОВОСИБИРСКЕ</div><h1>Красивые фото<br><span>на документы.</span></h1><p>Съёмка · Ретушь · Печать</p><p class="price">от 450 ₽</p><p class="address">10-й Порт-Артурский переулок, 75</p></div><img class="portrait" alt="Фото PHOTO ID" src="${asset('images/optimized/portrait-800.webp', 'image/webp')}"></main></html>`);
    await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    await page.screenshot({ path: path.join(root, 'images/social-cover.png') });
    console.log('Created images/social-cover.png (1200x630) from existing brand assets');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
