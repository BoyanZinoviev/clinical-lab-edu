/**
 * Проверка в безглав Chromium: зарежда всеки маршрут от офлайн версията и събира грешки в конзолата,
 * неуспешни заявки и външни мрежови обръщения. Изисква playwright (глобално) и /usr/bin/google-chrome.
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire('/home/claude/.npm-global/lib/node_modules/x.js');
const { chromium } = require('playwright');

const file = pathToFileURL(path.join(root, 'dist-offline/index.html')).href;
const routes = ['/', '/metodi', '/metodi/turbidimetriya', '/metodi/magnezii', '/metodi/fosfor', '/metodi/glyukoza', '/metodi/kreatinin', '/metodi/ise', '/metodi/kravno-gazov-analiz', '/metodi/hplc', '/kalibraciya', '/kachestven-kontrol', '/za-proekta', '/nesashtestvuvasht'];

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let failures = 0;
for (const [label, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport });
  for (const r of routes) {
    const page = await ctx.newPage();
    const problems = [];
    const external = [];
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') problems.push(`console.${m.type()}: ${m.text()}`);
    });
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('request', (req) => {
      const u = req.url();
      if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:') && !u.startsWith('about:')) external.push(u);
    });
    await page.goto(`${file}#${r}`);
    await page.waitForSelector('h1', { timeout: 8000 }).catch(() => problems.push('няма h1'));
    await page.waitForTimeout(300);
    const h1 = await page.locator('h1').first().innerText().catch(() => '');
    const h2 = await page.locator('main h2').count();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const bad = problems.length || external.length || overflow > 1;
    if (bad) failures++;
    console.log(`${bad ? 'ГРЕШКА' : 'ok    '} [${label}] ${r}  h1="${h1.slice(0, 60)}" h2=${h2} overflowX=${overflow}`);
    problems.slice(0, 5).forEach((p) => console.log('   ', p.slice(0, 300)));
    external.slice(0, 5).forEach((u) => console.log('    външна заявка:', u));
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log(failures ? `\nПроблеми: ${failures}` : '\nВсички маршрути са без грешки.');
process.exit(failures ? 1 : 0);
