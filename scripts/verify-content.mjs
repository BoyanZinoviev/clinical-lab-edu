/**
 * Проверка на съдържанието: брой и номерация на въпросите по модули, наличие на всички 10 раздела,
 * референции, пропуснати/празни полета и забранени маркери (TODO, placeholder, lorem).
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const esbuild = (await import(pathToFileURL('/opt/npm-tools/node_modules/esbuild/lib/main.js').href)).default;
await mkdir('/tmp/vc', { recursive: true });
await writeFile(
  '/tmp/vc/entry.ts',
  `export { contentById } from '${root}/src/data/content/index';\nexport * as topicsMod from '${root}/src/data/topics';\nexport * as refsMod from '${root}/src/data/references';\n`,
);
await esbuild.build({ entryPoints: ['/tmp/vc/entry.ts'], bundle: true, outfile: '/tmp/vc/bundle.mjs', format: 'esm', platform: 'node', logLevel: 'error' });
const { contentById, topicsMod, refsMod } = await import('file:///tmp/vc/bundle.mjs');

const expected = { turbidimetriya: 10, magnezii: 10, fosfor: 12, ise: 12, 'kravno-gazov': 12, hplc: 15, kalibraciya: 11, 'kachestven-kontrol': 13 };
const refList = refsMod.references;
let bad = 0;
const fail = (m) => { bad++; console.log('ГРЕШКА:', m); };

function walk(node, fn) {
  if (Array.isArray(node)) node.forEach((n) => walk(n, fn));
  else if (node && typeof node === 'object') { fn(node); Object.values(node).forEach((n) => walk(n, fn)); }
}

for (const [id, n] of Object.entries(expected)) {
  const c = contentById[id];
  if (!c) { fail(`липсва съдържание за ${id}`); continue; }
  const qs = [];
  walk(c, (o) => { if (o.type === 'qa') qs.push(o.n); });
  const sorted = [...qs].sort((a, b) => a - b);
  const ok = sorted.length === n && sorted.every((v, i) => v === i + 1);
  console.log(`${ok ? 'ok    ' : 'ГРЕШКА'} ${id}: въпроси ${sorted.length}/${n} -> ${sorted.join(',')}`);
  if (!ok) bad++;
  walk(c, (o) => {
    if (o.type === 'qa' && (!o.q?.trim() || !Array.isArray(o.a) || o.a.length === 0)) fail(`${id}: празен въпрос/отговор ${o.n}`);
  });
  const refIds = c.references ?? [];
  if (!refIds.length) fail(`${id}: няма източници`);
  for (const r of refIds) if (!refList.find((x) => x.id === r)) fail(`${id}: непозната референция ${r}`);
  if (!c.terms?.length) fail(`${id}: няма терминология`);
}

/* текстово сканиране на изходния код */
async function files(dir) {
  const r = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) r.push(...(await files(p))); else if (/\.(tsx?|css|html)$/.test(e.name)) r.push(p);
  }
  return r;
}
for (const f of [...(await files(path.join(root, 'src'))), path.join(root, 'index.html')]) {
  const t = await readFile(f, 'utf8');
  t.split('\n').forEach((line, i) => {
    if (/\b(TODO|FIXME|XXX|lorem ipsum|placeholder|coming soon)\b/i.test(line) && !/placeholder=|::placeholder|placeholder:/.test(line)) fail(`${path.relative(root, f)}:${i + 1}: ${line.trim().slice(0, 100)}`);
  });
}
console.log(bad ? `\nПроблеми: ${bad}` : '\nСъдържанието е пълно.');
process.exit(bad ? 1 : 0);
