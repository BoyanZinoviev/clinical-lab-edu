/**
 * Образователна реализация на правилата на Westgard върху едно ниво на контрола.
 * Входът са z-оценки: z = (x − средна) / SD.
 */

export type RuleId = 'r12s' | 'r13s' | 'r22s' | 'rR4s' | 'r41s' | 'r10x';
export type ErrorKind = 'random' | 'systematic' | 'none';

export interface RuleInfo {
  id: RuleId;
  label: string;
  /** Кратко име за показване. */
  short: string;
  type: 'warning' | 'reject';
  error: ErrorKind;
  condition: string;
  meaning: string;
}

export const RULES: RuleInfo[] = [
  {
    id: 'r12s',
    label: '1₂s',
    short: '1₂s',
    type: 'warning',
    error: 'none',
    condition: 'Един контролен резултат е извън ±2 SD.',
    meaning:
      'Предупреждение: при нормално разпределение около 5 % от резултатите излизат извън ±2 SD дори когато системата е в ред. Проверяват се останалите правила.',
  },
  {
    id: 'r13s',
    label: '1₃s',
    short: '1₃s',
    type: 'reject',
    error: 'random',
    condition: 'Един контролен резултат е извън ±3 SD.',
    meaning:
      'Отхвърляне: случайно събитие извън ±3 SD е много рядко (около 0,3 %). Най-често сочи случайна грешка (или много голяма системна).',
  },
  {
    id: 'r22s',
    label: '2₂s',
    short: '2₂s',
    type: 'reject',
    error: 'systematic',
    condition: 'Два последователни резултата са извън един и същи предел (+2 SD или −2 SD).',
    meaning: 'Отхвърляне: два резултата от една и съща страна далеч от средната рядко са случайни – сочи системна грешка.',
  },
  {
    id: 'rR4s',
    label: 'R₄s',
    short: 'R₄s',
    type: 'reject',
    error: 'random',
    condition: 'Един резултат е над +2 SD, а съседен – под −2 SD (разлика над 4 SD).',
    meaning: 'Отхвърляне: големият размах между две измервания сочи увеличено разсейване – случайна грешка.',
  },
  {
    id: 'r41s',
    label: '4₁s',
    short: '4₁s',
    type: 'reject',
    error: 'systematic',
    condition: 'Четири последователни резултата са над +1 SD или четири са под −1 SD.',
    meaning: 'Отхвърляне: устойчиво отклонение в една посока – начало на системна грешка (изместване или тренд).',
  },
  {
    id: 'r10x',
    label: '10x',
    short: '10x',
    type: 'reject',
    error: 'systematic',
    condition: 'Десет последователни резултата са от една и съща страна на средната.',
    meaning: 'Отхвърляне: дори малко, но устойчиво изместване на средната сочи системна грешка.',
  },
];

export const ruleById = (id: RuleId): RuleInfo => RULES.find((r) => r.id === id) as RuleInfo;

export interface Violation {
  rule: RuleId;
  /** Индекси (0-базирани) на точките, които участват в нарушението. */
  points: number[];
  /** Индекс на точката, на която правилото се „задейства“. */
  at: number;
}

/** Връща всички нарушения за разрешените правила. */
export function evaluate(z: readonly number[], enabled: ReadonlySet<RuleId>): Violation[] {
  const out: Violation[] = [];
  const n = z.length;

  for (let i = 0; i < n; i++) {
    if (enabled.has('r12s') && Math.abs(z[i]) > 2) out.push({ rule: 'r12s', points: [i], at: i });
    if (enabled.has('r13s') && Math.abs(z[i]) > 3) out.push({ rule: 'r13s', points: [i], at: i });

    if (i >= 1) {
      const a = z[i - 1];
      const b = z[i];
      if (enabled.has('r22s') && ((a > 2 && b > 2) || (a < -2 && b < -2))) out.push({ rule: 'r22s', points: [i - 1, i], at: i });
      if (enabled.has('rR4s') && ((a > 2 && b < -2) || (a < -2 && b > 2))) out.push({ rule: 'rR4s', points: [i - 1, i], at: i });
    }

    if (i >= 3 && enabled.has('r41s')) {
      const w = z.slice(i - 3, i + 1);
      if (w.every((v) => v > 1) || w.every((v) => v < -1)) out.push({ rule: 'r41s', points: [i - 3, i - 2, i - 1, i], at: i });
    }

    if (i >= 9 && enabled.has('r10x')) {
      const w = z.slice(i - 9, i + 1);
      if (w.every((v) => v > 0) || w.every((v) => v < 0)) out.push({ rule: 'r10x', points: [i - 9, i - 8, i - 7, i - 6, i - 5, i - 4, i - 3, i - 2, i - 1, i], at: i });
    }
  }
  return out;
}

export type RunStatus = 'accept' | 'warning' | 'reject';

export interface Assessment {
  status: RunStatus;
  /** Разпознат тип грешка по нарушените правила за отхвърляне. */
  error: 'random' | 'systematic' | 'mixed' | 'none';
  /** Нарушени правила (уникални, по реда в RULES). */
  rules: RuleId[];
}

export function assess(violations: readonly Violation[]): Assessment {
  const rules = RULES.map((r) => r.id).filter((id) => violations.some((v) => v.rule === id));
  const rejects = rules.filter((id) => ruleById(id).type === 'reject');
  const hasRandom = rejects.some((id) => ruleById(id).error === 'random');
  const hasSys = rejects.some((id) => ruleById(id).error === 'systematic');
  return {
    status: rejects.length ? 'reject' : rules.length ? 'warning' : 'accept',
    error: hasRandom && hasSys ? 'mixed' : hasRandom ? 'random' : hasSys ? 'systematic' : 'none',
    rules,
  };
}
