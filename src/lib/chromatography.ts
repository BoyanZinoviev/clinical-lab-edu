/**
 * Образователен модел на изократна обратнофазова хроматография.
 * Всички числа са илюстративни – компонентите A, B и C са условни.
 */

export interface Analyte {
  id: 'A' | 'B' | 'C';
  name: string;
  /** Фактор на задържане при базов състав на подвижната фаза. */
  k0: number;
  /** Условен отклик (площ за единица относителна концентрация). */
  response: number;
  colorVar: string;
}

export const DEAD_TIME = 0.8; // t0, мин
export const PLATES = 500; // N (еднакво за всички компоненти)
export const BASE_ORGANIC = 40; // % органичен разтворител при базовия състав
export const LOG_K_SLOPE = 0.03; // промяна на log10 k за 1 % органичен разтворител
export const RUN_MIN = 10; // продължителност на пробега, мин

export const ANALYTES: Analyte[] = [
  { id: 'A', name: 'Компонент A', k0: 1.25, response: 120, colorVar: 'var(--v-antibody)' },
  { id: 'B', name: 'Компонент B', k0: 3.0, response: 200, colorVar: 'var(--v-hapten)' },
  { id: 'C', name: 'Компонент C', k0: 5.25, response: 90, colorVar: 'var(--v-hba1c)' },
];

export interface PeakModel {
  analyte: Analyte;
  conc: number;
  k: number;
  tR: number;
  sigma: number;
  width: number; // ширина при основата, w = 4σ
  area: number;
  height: number;
}

/** Строи модела на трите пика за дадена сила на елуиране и относителни концентрации. */
export function buildPeaks(organic: number, conc: Record<Analyte['id'], number>, plates: number = PLATES): PeakModel[] {
  const scale = 10 ** (-LOG_K_SLOPE * (organic - BASE_ORGANIC));
  return ANALYTES.map((a) => {
    const k = a.k0 * scale;
    const tR = DEAD_TIME * (1 + k);
    const sigma = tR / Math.sqrt(plates);
    const area = a.response * conc[a.id];
    const height = area / (sigma * Math.sqrt(2 * Math.PI));
    return { analyte: a, conc: conc[a.id], k, tR, sigma, width: 4 * sigma, area, height };
  });
}

/** Сигнал на детектора в момент t (сума на Гаусови пикове). */
export function signalAt(peaks: readonly PeakModel[], t: number): number {
  let s = 0;
  for (const p of peaks) s += p.height * Math.exp(-0.5 * ((t - p.tR) / p.sigma) ** 2);
  return s;
}

/** Разделителна способност между два съседни пика: Rs = 2(tR2 − tR1)/(w1 + w2). */
export function resolution(a: PeakModel, b: PeakModel): number {
  return (2 * Math.abs(b.tR - a.tR)) / (a.width + b.width);
}
