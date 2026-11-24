/* Малки математически помощници за образователните симулации. */

/** Форматира число с десетична запетая (български формат) и типографски минус. */
export function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—';
  let s = n.toFixed(digits);
  if (Number(s) === 0) s = s.replace('-', '');
  return s.replace('.', ',').replace('-', '−');
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Детерминиран генератор на псевдослучайни числа (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Нормално разпределена стойност (Box-Muller) с N(0,1). */
export function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function mean(xs: readonly number[]): number {
  if (!xs.length) return NaN;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/** Извадково стандартно отклонение (n − 1). */
export function sd(xs: readonly number[]): number {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

export interface LinearFit {
  a: number; // пресечна точка
  b: number; // наклон
  r2: number;
  r: number;
  n: number;
  ok: boolean;
}

/** Линейна регресия по метода на най-малките квадрати: y = a + b·x. */
export function linearFit(xs: readonly number[], ys: readonly number[]): LinearFit {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return { a: NaN, b: NaN, r2: NaN, r: NaN, n, ok: false };
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0) return { a: NaN, b: NaN, r2: NaN, r: NaN, n, ok: false };
  const b = sxy / sxx;
  const a = my - b * mx;
  const r = syy === 0 ? 1 : sxy / Math.sqrt(sxx * syy);
  return { a, b, r, r2: r * r, n, ok: Number.isFinite(b) && b !== 0 };
}

/** „Приятни“ деления за ос. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(Number(v.toFixed(10)));
  return out;
}
