/**
 * Интерактивна проверка: управлява всички визуализации (бутони, плъзгачи, избор) в безглав Chromium,
 * следи за грешки и записва снимки в shots/ за визуален преглед.
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
const ctx = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
const problems = [];

async function open(route) {
  const page = await ctx.newPage();
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && problems.push(`${route} console.${m.type()}: ${m.text().slice(0, 250)}`));
  page.on('pageerror', (e) => problems.push(`${route} pageerror: ${e.message}`));
  await page.goto(`${file}#${route}`);
  await page.waitForSelector('h1');
  await page.waitForTimeout(200);
  return page;
}
const fig = (page, i) => page.locator('main figure.card').nth(i);
async function snap(page, i, name) {
  const f = fig(page, i);
  await f.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await f.screenshot({ path: path.join(shots, `${name}.png`) });
}
const btn = (page, i, label) => fig(page, i).getByRole('button', { name: label, exact: false }).first();
async function setRange(page, i, labelRe, value) {
  const el = fig(page, i).getByLabel(labelRe).first();
  await el.evaluate((n, v) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(n, String(v));
    n.dispatchEvent(new Event('input', { bubbles: true }));
    n.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

/* 1. Турбидиметрия */
{
  const p = await open('/metodi/turbidimetriya');
  await snap(p, 0, 'turb-1');
  for (let k = 0; k < 4; k++) await btn(p, 0, 'Следващ етап').click();
  await snap(p, 0, 'turb-5');
  await setRange(p, 0, /Условно ниво на HbA1c/, 11);
  for (let k = 0; k < 3; k++) await btn(p, 0, 'Следващ етап').click();
  await snap(p, 0, 'turb-8-high');
  await btn(p, 0, 'Отначало').click();
  await btn(p, 0, 'Пусни').click();
  await p.waitForTimeout(800);
  await btn(p, 0, 'Пауза').click();
  await p.close();
}
/* 2. Магнезий */
{
  const p = await open('/metodi/magnezii');
  for (let k = 0; k < 4; k++) await btn(p, 0, 'Следващ етап').click();
  await snap(p, 0, 'mg-5');
  await btn(p, 0, 'Следващ етап').click();
  await btn(p, 0, 'Следващ етап').click();
  await btn(p, 0, 'Следващ етап').click();
  await setRange(p, 0, /Условна концентрация на магнезий/, 1.8);
  await fig(p, 0).getByRole('button', { name: /Проба 2/ }).click();
  await snap(p, 0, 'mg-8');
  await p.close();
}
/* 3. ISE */
{
  const p = await open('/metodi/ise');
  await snap(p, 0, 'ise-na');
  await fig(p, 0).getByRole('radio', { name: /Cl⁻ електрод/ }).click();
  await setRange(p, 0, /Концентрация на Cl/, 85);
  await setRange(p, 0, /Реален наклон/, 52);
  await snap(p, 0, 'ise-cl');
  await fig(p, 0).getByRole('radio', { name: /K⁺ електрод/ }).click();
  await snap(p, 0, 'ise-k');
  await setRange(p, 1, /Дял на твърдата фаза/, 0.16);
  await snap(p, 1, 'ise-direct-indirect');
  await p.close();
}
/* 4. Кръвни газове */
{
  const p = await open('/metodi/kravno-gazov-analiz');
  for (let k = 0; k < 3; k++) await btn(p, 0, 'Следващ етап').click();
  await fig(p, 0).getByRole('radio', { name: /Респираторна ацидоза/ }).click();
  await fig(p, 0).getByRole('radio', { name: /pCO₂/ }).first().click();
  await snap(p, 0, 'abg-4');
  await btn(p, 0, 'Следващ етап').click();
  await btn(p, 0, 'Следващ етап').click();
  await fig(p, 0).getByRole('radio', { name: /pO₂/ }).first().click();
  await snap(p, 0, 'abg-6');
  await fig(p, 1).getByRole('radio', { name: /Метаболитна ацидоза/ }).click();
  await snap(p, 1, 'abg-explorer-macid');
  await setRange(p, 1, /pH \(измерено\)/, 7.55);
  await setRange(p, 1, /pCO₂ \(измерено\)/, 24);
  await snap(p, 1, 'abg-explorer-custom');
  await p.close();
}
/* 5. HPLC */
{
  const p = await open('/metodi/hplc');
  await snap(p, 0, 'hplc-0');
  await btn(p, 0, 'Пусни пробега').click();
  await p.waitForTimeout(3500);
  await btn(p, 0, 'Пауза').click();
  await snap(p, 0, 'hplc-play');
  await fig(p, 0).getByRole('button', { name: /Избери пик C/ }).click();
  await setRange(p, 0, /Компонент C/, 1.8);
  await setRange(p, 0, /Дял органичен разтворител/, 46);
  await setRange(p, 0, /Ефективност на колоната/, 120);
  await setRange(p, 0, /Преглед по време/, 10);
  await snap(p, 0, 'hplc-end');
  await p.close();
}
/* 6. Калибрация */
{
  const p = await open('/kalibraciya');
  for (let k = 0; k < 5; k++) await btn(p, 0, 'Следващ етап').click();
  await snap(p, 0, 'cal-manual-6');
  await fig(p, 0).getByRole('button', { name: 'Нелинеен пример' }).click();
  await snap(p, 0, 'cal-manual-nonlinear');
  await fig(p, 1).getByRole('radio', { name: /Неуспешна калибрация/ }).click();
  for (let k = 0; k < 5; k++) await btn(p, 1, 'Следващ етап').click();
  await snap(p, 1, 'cal-auto-fail');
  await fig(p, 1).getByRole('radio', { name: /Успешна калибрация/ }).click();
  await snap(p, 1, 'cal-auto-ok');
  await p.close();
}
/* 7. QC */
{
  const p = await open('/kachestven-kontrol');
  await snap(p, 0, 'qc-normal');
  await fig(p, 0).getByRole('radio', { name: /2₂s/ }).click();
  await snap(p, 0, 'qc-22s');
  await fig(p, 0).getByRole('radio', { name: /R₄s/ }).click();
  await setRange(p, 0, /Разсейване спрямо нормалното/, 2.4);
  await setRange(p, 0, /Големина на изместването/, 1.8);
  await snap(p, 0, 'qc-sim');
  await fig(p, 0).getByRole('button', { name: /Точка 15:/ }).click();
  await snap(p, 0, 'qc-select');
  await snap(p, 1, 'qc-targets');
  await p.close();
}

await browser.close();
if (problems.length) {
  console.log('ПРОБЛЕМИ:');
  [...new Set(problems)].forEach((x) => console.log(' ', x));
  process.exit(1);
}
console.log('Всички взаимодействия минаха без грешки. Снимките са в shots/.');
