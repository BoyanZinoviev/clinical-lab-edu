/**
 * Търси елементи, които излизат извън видимата ширина на мобилен екран (без да са в хоризонтално превъртащ се контейнер).
 */
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire('/home/claude/.npm-global/lib/node_modules/x.js');
const { chromium } = require('playwright');
const file = pathToFileURL(path.join(root, 'dist-offline/index.html')).href;
const routes = ['/', '/metodi', '/metodi/turbidimetriya', '/metodi/magnezii', '/metodi/fosfor', '/metodi/glyukoza', '/metodi/kreatinin', '/metodi/ise', '/metodi/kravno-gazov-analiz', '/metodi/hplc', '/kalibraciya', '/kachestven-kontrol', '/za-proekta'];
const widths = (process.argv[2] ?? '390,360').split(',').map(Number);
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let total = 0;
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true });
  for (const r of routes) {
    const p = await ctx.newPage();
    await p.goto(`${file}#${r}`);
    await p.waitForSelector('h1');
    await p.waitForTimeout(300);
    const bad = await p.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const out = [];
      const scrollable = (el) => { const s = getComputedStyle(el); return /(auto|scroll)/.test(s.overflowX); };
      for (const el of document.querySelectorAll('main *')) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.right <= vw + 1) continue;
        // декоративни елементи (pointer-events-none) и скрити подсказки са изрязани/невидими – не са проблем
        if (getComputedStyle(el).visibility === 'hidden' || el.closest('.pointer-events-none')) continue;
        let a = el.parentElement, inScroll = false;
        while (a && a !== document.body) { if (scrollable(a)) { inScroll = true; break; } a = a.parentElement; }
        if (inScroll) continue;
        // само най-горния нарушител
        if (out.some((o) => o.el.contains(el))) continue;
        out.push({ el, tag: el.tagName.toLowerCase(), cls: (el.getAttribute('class') ?? '').slice(0, 90), right: Math.round(rect.right), text: (el.textContent ?? '').trim().slice(0, 40) });
      }
      return out.map(({ el, ...rest }) => rest);
    });
    if (bad.length) {
      total += bad.length;
      console.log(`[${w}] ${r}`);
      bad.slice(0, 6).forEach((b) => console.log(`    <${b.tag}> right=${b.right} class="${b.cls}" «${b.text}»`));
    }
    await p.close();
  }
  await ctx.close();
}
await browser.close();
console.log(total ? `\nНарушители: ${total}` : '\nНяма съдържание извън екрана.');
process.exit(total ? 1 : 0);
