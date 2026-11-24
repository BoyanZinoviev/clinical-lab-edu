/**
 * Проверки на интерфейса: тъмна тема, търсене, мобилно меню, клавиатура, наличие на разделите,
 * „протекли“ маркери в текста и снимки в shots/.
 */
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire('/home/claude/.npm-global/lib/node_modules/x.js');
const { chromium } = require('playwright');
const file = pathToFileURL(path.join(root, 'dist-offline/index.html')).href;
const shots = path.join(root, 'shots');
await mkdir(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? 'ok    ' : 'ГРЕШКА'} ${msg}`); if (!ok) bad++; };
const problems = [];
async function newPage(ctx, route) {
  const p = await ctx.newPage();
  p.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && problems.push(`${route} ${m.text().slice(0, 200)}`));
  p.on('pageerror', (e) => problems.push(`${route} ${e.message}`));
  await p.goto(`${file}#${route}`);
  await p.waitForSelector('h1');
  return p;
}

/* ───── Десктоп ───── */
const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
{
  const p = await newPage(desk, '/');
  await p.screenshot({ path: path.join(shots, 'home-light.png') });
  // първи Tab → „към съдържанието“
  await p.keyboard.press('Tab');
  const first = await p.evaluate(() => document.activeElement?.textContent?.trim());
  check(/съдържание/i.test(first ?? ''), `Първият Tab фокусира „${first}“`);
  // тъмна тема
  await p.getByRole('button', { name: /тъмна тема/ }).click();
  check(await p.evaluate(() => document.documentElement.classList.contains('dark')), 'Тъмната тема се включва');
  await p.screenshot({ path: path.join(shots, 'home-dark.png') });
  await p.goto(`${file}#/metodi/hplc`);
  await p.waitForSelector('h1');
  await p.locator('main figure.card').nth(0).scrollIntoViewIfNeeded();
  await p.waitForTimeout(600);
  await p.locator('main figure.card').nth(0).screenshot({ path: path.join(shots, 'hplc-dark.png') });
  await p.goto(`${file}#/kachestven-kontrol`);
  await p.waitForSelector('h1');
  await p.locator('main figure.card').nth(0).scrollIntoViewIfNeeded();
  await p.waitForTimeout(600);
  await p.locator('main figure.card').nth(0).screenshot({ path: path.join(shots, 'qc-dark.png') });
  // темата се запазва след презареждане
  await p.reload();
  await p.waitForSelector('h1');
  check(await p.evaluate(() => document.documentElement.classList.contains('dark')), 'Темата се запазва след презареждане');
  await p.getByRole('button', { name: /светла тема/ }).click();
  check(!(await p.evaluate(() => document.documentElement.classList.contains('dark'))), 'Светлата тема се връща');
  await p.close();
}
{
  /* Търсене */
  const p = await newPage(desk, '/');
  await p.keyboard.press('Control+k');
  const dlg = p.getByRole('dialog');
  check(await dlg.isVisible(), 'Ctrl+K отваря търсенето');
  await p.getByRole('combobox').or(p.getByRole('searchbox')).or(dlg.locator('input')).first().fill('ротор');
  await p.waitForTimeout(250);
  const n0 = await dlg.getByRole('option').count();
  console.log('   резултати за „ротор“ (несъществуващо):', n0);
  await dlg.locator('input').fill('калибрация');
  await p.waitForTimeout(250);
  const n1 = await dlg.getByRole('option').count();
  check(n1 > 0, `Търсене „калибрация“ връща ${n1} резултата`);
  await p.screenshot({ path: path.join(shots, 'search.png') });
  await p.keyboard.press('Enter');
  await p.waitForTimeout(400);
  check(!(await dlg.isVisible().catch(() => false)), 'Enter затваря търсенето и навигира: ' + (await p.evaluate(() => location.hash)));
  await p.keyboard.press('Control+k');
  await dlg.locator('input').fill('Westgard');
  await p.waitForTimeout(250);
  check((await dlg.getByRole('option').count()) > 0, 'Търсене „Westgard“ има резултати');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(250);
  check(!(await dlg.isVisible().catch(() => false)), 'Escape затваря търсенето');
  await p.close();
}
{
  /* Всеки модул: 10 раздела по ред, Q&A, източници; няма протекли маркери */
  const expected = ['Въведение', 'Принцип на метода', 'Необходими компоненти', 'Графична визуализация', 'Процес на измерване', 'Интерпретация на резултатите', 'Предимства и ограничения', 'Важно за изпита', 'Терминология', 'Източници'];
  for (const r of ['/metodi/turbidimetriya', '/metodi/magnezii', '/metodi/fosfor', '/metodi/ise', '/metodi/kravno-gazov-analiz', '/metodi/hplc', '/kalibraciya', '/kachestven-kontrol']) {
    const p = await newPage(desk, r);
    const h2 = (await p.locator('main h2').allInnerTexts()).map((t) => t.replace(/^\s*\d+[.\s]*/, '').trim());
    const same = expected.every((e, i) => (h2[i] ?? '').toLowerCase().includes(e.toLowerCase()));
    check(same, `${r}: разделите са в зададения ред${same ? '' : ' → ' + h2.join(' | ')}`);
    const text = await p.locator('main').innerText();
    const leaks = text.match(/\*\*|\{\{|\}\}|undefined|NaN|\[object|\bnull\b/g);
    check(!leaks, `${r}: няма протекли маркери${leaks ? ' → ' + [...new Set(leaks)].join(',') : ''}`);
    const refs = await p.locator('main li').filter({ hasText: /\d{4}/ }).count();
    check(refs >= 3, `${r}: източници в края (${refs})`);
    // Latin-only думи (за преглед)
    const latin = [...new Set(text.match(/\b[A-Za-z][A-Za-z\-]{3,}\b/g) ?? [])];
    console.log(`   латиница (${latin.length}):`, latin.slice(0, 60).join(', '));
    await p.close();
  }
}
await desk.close();

/* ───── Мобилно ───── */
const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
{
  const p = await newPage(mob, '/');
  const sidebarVisible = await p.getByRole('navigation', { name: 'Основна навигация' }).isVisible().catch(() => false);
  check(!sidebarVisible, 'На мобилно страничната лента е скрита по подразбиране');
  await p.getByRole('button', { name: 'Отвори менюто' }).click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(shots, 'mobile-menu.png') });
  await p.getByRole('link', { name: 'Калибрация' }).first().click();
  await p.waitForTimeout(500);
  check((await p.evaluate(() => location.hash)).includes('/kalibraciya'), 'Менюто навигира към Калибрация');
  check(!(await p.getByRole('navigation', { name: 'Основна навигация' }).isVisible().catch(() => false)), 'Менюто се затваря след избор');
  await p.screenshot({ path: path.join(shots, 'mobile-cal.png') });
  await p.goto(`${file}#/metodi/ise`);
  await p.waitForSelector('h1');
  await p.locator('main figure.card').nth(0).scrollIntoViewIfNeeded();
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(shots, 'mobile-ise.png') });
  await p.close();
}
await mob.close();
await browser.close();
if (problems.length) { console.log('\nКонзола:'); [...new Set(problems)].forEach((x) => console.log('  ', x)); bad++; }
console.log(bad ? `\nПроблеми: ${bad}` : '\nВсички UI проверки минаха.');
process.exit(bad ? 1 : 0);
