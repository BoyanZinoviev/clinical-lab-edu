/**
 * Образователни изчисления за киселинно-алкален баланс.
 * pH и pCO₂ са ИЗМЕРЕНИ от анализатора; HCO₃⁻ и BE се ИЗЧИСЛЯВАТ.
 */

/** Henderson–Hasselbalch: HCO₃⁻ (mmol/L) = 0,0307 × pCO₂ (mmHg) × 10^(pH − 6,1). */
export function bicarbonate(pH: number, pCO2mmHg: number): number {
  return 0.0307 * pCO2mmHg * 10 ** (pH - 6.1);
}

/** Приблизителен излишък/дефицит на основи (образователна формула). */
export function baseExcess(pH: number, hco3: number): number {
  return 0.93 * (hco3 - 24.4 + 14.8 * (pH - 7.4));
}

export const mmHgToKPa = (v: number) => v * 0.133322;

/** Ориентировъчни референтни граници (зависят от лабораторията и метода). */
export const REF = {
  pH: [7.35, 7.45] as const,
  pCO2: [35, 45] as const,
  hco3: [22, 26] as const,
  pO2: [80, 100] as const,
};

export interface Classification {
  /** Заглавие на извода. */
  title: string;
  /** Пояснение. */
  text: string;
  tone: 'ok' | 'acid' | 'alk' | 'mixed';
  /** Състояние на трите показателя. */
  pH: 'low' | 'normal' | 'high';
  pCO2: 'low' | 'normal' | 'high';
  hco3: 'low' | 'normal' | 'high';
}

const level = (v: number, [lo, hi]: readonly [number, number]): 'low' | 'normal' | 'high' => (v < lo ? 'low' : v > hi ? 'high' : 'normal');

/**
 * Лек образователен алгоритъм за разпознаване на първично нарушение.
 * Не е клиничен алгоритъм и не взема решения за пациент.
 */
export function classify(pH: number, pCO2: number): Classification {
  const hco3 = bicarbonate(pH, pCO2);
  const lp = level(pH, REF.pH);
  const lc = level(pCO2, REF.pCO2);
  const lb = level(hco3, REF.hco3);
  const base = { pH: lp, pCO2: lc, hco3: lb };

  if (lp === 'normal' && lc === 'normal' && lb === 'normal') {
    return { ...base, tone: 'ok', title: 'Показателите са в ориентировъчните граници', text: 'pH, pCO₂ и HCO₃⁻ са в рамките на типичните референтни граници – няма данни за киселинно-алкално нарушение в този образователен пример.' };
  }

  if (lp === 'low') {
    if (lc === 'high' && lb !== 'low')
      return { ...base, tone: 'acid', title: 'Респираторна ацидоза', text: 'pH е ниско, а pCO₂ е високо – първичният проблем е в белодробната вентилация (задържане на CO₂). Ако HCO₃⁻ е повишен, това показва бъбречна компенсация.' };
    if (lb === 'low' && lc !== 'high')
      return { ...base, tone: 'acid', title: 'Метаболитна ацидоза', text: 'pH е ниско, а HCO₃⁻ е ниско – първичният проблем е метаболитен (загуба на бикарбонат или добавени киселини). Ниско pCO₂ показва респираторна компенсация (хипервентилация).' };
    if (lc === 'high' && lb === 'low')
      return { ...base, tone: 'mixed', title: 'Смесена ацидоза', text: 'pH е ниско, pCO₂ е високо и HCO₃⁻ е ниско – едновременно респираторен и метаболитен компонент, които влошават pH в една посока.' };
    return { ...base, tone: 'acid', title: 'Ацидемия', text: 'pH е ниско. За определяне на първичния компонент се разглеждат pCO₂ и HCO₃⁻ заедно.' };
  }

  if (lp === 'high') {
    if (lc === 'low' && lb !== 'high')
      return { ...base, tone: 'alk', title: 'Респираторна алкалоза', text: 'pH е високо, а pCO₂ е ниско – първичният проблем е хипервентилация (прекомерно отделяне на CO₂). Ниско HCO₃⁻ може да показва бъбречна компенсация.' };
    if (lb === 'high' && lc !== 'low')
      return { ...base, tone: 'alk', title: 'Метаболитна алкалоза', text: 'pH е високо, а HCO₃⁻ е високо – първичният проблем е метаболитен (излишък на бикарбонат или загуба на киселини). Повишено pCO₂ може да е респираторна компенсация.' };
    if (lc === 'low' && lb === 'high')
      return { ...base, tone: 'mixed', title: 'Смесена алкалоза', text: 'pH е високо, pCO₂ е ниско и HCO₃⁻ е високо – респираторен и метаболитен компонент, които повишават pH едновременно.' };
    return { ...base, tone: 'alk', title: 'Алкалемия', text: 'pH е високо. За определяне на първичния компонент се разглеждат pCO₂ и HCO₃⁻ заедно.' };
  }

  // pH в нормата, но pCO₂ или HCO₃⁻ са извън нея
  if (lc !== 'normal' && lb !== 'normal')
    return { ...base, tone: 'mixed', title: 'Компенсирано или смесено нарушение', text: 'pH е в нормата, но pCO₂ и HCO₃⁻ са извън граници. Възможна е пълна компенсация или противоположно действащи нарушения – образователният модел не може да ги различи без клиничен контекст.' };
  return { ...base, tone: 'mixed', title: 'Изолирано отклонение при нормално pH', text: 'pH е в нормата, но един от показателите е извън границите. Необходима е допълнителна информация и клиничен контекст.' };
}

export interface Scenario {
  id: string;
  label: string;
  sub: string;
  pH: number;
  pCO2: number;
  pO2: number;
}

/** Илюстративни сценарии (не са данни на реални пациенти). */
export const SCENARIOS: Scenario[] = [
  { id: 'normal', label: 'Нормален', sub: 'pH 7,40 · pCO₂ 40', pH: 7.4, pCO2: 40, pO2: 95 },
  { id: 'racid', label: 'Респираторна ацидоза', sub: 'pH 7,25 · pCO₂ 60', pH: 7.25, pCO2: 60, pO2: 70 },
  { id: 'ralk', label: 'Респираторна алкалоза', sub: 'pH 7,55 · pCO₂ 25', pH: 7.55, pCO2: 25, pO2: 105 },
  { id: 'macid', label: 'Метаболитна ацидоза', sub: 'pH 7,25 · pCO₂ 28', pH: 7.25, pCO2: 28, pO2: 100 },
  { id: 'malk', label: 'Метаболитна алкалоза', sub: 'pH 7,50 · pCO₂ 46', pH: 7.5, pCO2: 46, pO2: 92 },
];
