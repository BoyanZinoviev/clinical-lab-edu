/**
 * Помощен скрипт: събира приложението в ЕДИН самостоятелен HTML файл (dist-offline/index.html),
 * който работи с двоен клик (file://), без сървър и без мрежа.
 *
 * Нормалният начин за изграждане е `npm run build` (Vite). Този скрипт се използва за проверка
 * в среда без достъп до npm и като допълнителна „офлайн“ версия.
 *
 * Изисква локално инсталирани: esbuild, tailwindcss (v4), react, react-dom.
 * Пътищата могат да се зададат с променливи на средата (NODE_PATHS, разделени с „:“).
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const searchPaths = (process.env.NODE_PATHS ?? '/opt/npm-tools/node_modules:/home/claude/.npm-global/lib/node_modules:' + path.join(root, 'node_modules'))
  .split(':')
  .filter(Boolean);

function resolvePkg(name) {
  for (const base of searchPaths) {
    const req = createRequire(path.join(base, 'x.js'));
    try {
      return path.dirname(req.resolve(`${name}/package.json`));
    } catch {
      /* следващият път */
    }
  }
  throw new Error(`Не е намерен пакетът ${name}`);
}

const esbuildDir = resolvePkg('esbuild');
const twDir = resolvePkg('tailwindcss');
const esbuild = await import(pathToFileURL(path.join(esbuildDir, 'lib', 'main.js')).href).then((m) => m.default ?? m);
const { compile } = await import(pathToFileURL(path.join(twDir, 'dist', 'lib.mjs')).href);

/* 1. JavaScript */
const js = await esbuild.build({
  entryPoints: [path.join(root, 'src/main.tsx')],
  bundle: true,
  write: false,
  format: 'iife',
  target: 'es2020',
  minify: true,
  jsx: 'automatic',
  platform: 'browser',
  loader: { '.css': 'empty' },
  define: { 'process.env.NODE_ENV': '"production"' },
  nodePaths: searchPaths,
  legalComments: 'none',
  logLevel: 'warning',
});
const code = js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

/* 2. CSS (Tailwind v4 – компилатор с обхождане на изходния код за имена на класове) */
async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(tsx?|html)$/.test(e.name)) out.push(p);
  }
  return out;
}
const files = [...(await walk(path.join(root, 'src'))), path.join(root, 'index.html')];
const candidates = new Set();
for (const f of files) {
  const text = await readFile(f, 'utf8');
  // Прекомерното събиране е безопасно – неизползвани кандидати просто не генерират CSS.
  for (const t of text.split(/[\s"'`{}<>()=,;|\\]+/)) if (t && t.length < 120) candidates.add(t);
  // Произволните стойности на Tailwind (напр. grid-cols-[minmax(0,1fr)_...]) съдържат скоби и запетаи – не се режат по тях.
  for (const t of text.split(/[\s"'`{}<>=;|\\]+/)) if (t && t.length < 160) candidates.add(t);
}
const cssSource = await readFile(path.join(root, 'src/styles/index.css'), 'utf8');
const compiler = await compile(cssSource, {
  base: path.join(root, 'src/styles'),
  onDependency: () => {},
  async loadStylesheet(id, base) {
    let file;
    if (id === 'tailwindcss') file = path.join(twDir, 'index.css');
    else if (id.startsWith('tailwindcss/')) file = path.join(twDir, id.slice('tailwindcss/'.length));
    else file = path.resolve(base, id);
    return { path: file, base: path.dirname(file), content: await readFile(file, 'utf8') };
  },
});
const css = compiler.build([...candidates]);

/* 3. HTML */
let html = await readFile(path.join(root, 'index.html'), 'utf8');
html = html.replace('</head>', () => `    <style>${css}</style>\n  </head>`);
html = html.replace(/<script type="module" src="\/src\/main\.tsx"><\/script>/, () => `<script>${code}</script>`);

const outDir = path.join(root, 'dist-offline');
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'index.html'), html);
console.log(`dist-offline/index.html – ${(html.length / 1024).toFixed(0)} KB (JS ${(code.length / 1024).toFixed(0)} KB, CSS ${(css.length / 1024).toFixed(0)} KB)`);
