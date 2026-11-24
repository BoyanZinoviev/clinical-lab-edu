import { useId, useMemo, useState } from 'react';
import { VizFrame, ExplainPanel, ValuePill } from '../ui/VizFrame';
import { Segmented, Slider, Toggle } from '../ui/Controls';
import { Icon } from '../ui/Icon';
import { Txt } from './shared';
import { RULES, assess, evaluate, ruleById } from '../../lib/westgard';
import type { RuleId } from '../../lib/westgard';
import { clamp, fmt, gaussian, mean, mulberry32, sd } from '../../lib/stats';

/* Илюстративен контролен материал: условен аналит. */
const MEAN = 5.0;
const SD = 0.1;
const UNIT = 'mmol/L';
const N = 30;

const CALM = [0.3, -0.5, 0.8, -0.2, -0.9, 0.4, 1.1, -0.3, 0.6, -1.2, 0.2, 0.9, -0.7, -0.1, 0.5, -0.6, 1.0, 0.1, -0.8, 0.7, -0.4, 0.3, -1.1, 0.6, -0.2, 0.8, -0.5, 0.2, -0.9, 0.4];

type Mode = 'normal' | 'r12s' | 'r13s' | 'r22s' | 'rR4s' | 'r41s' | 'r10x' | 'random';

const PRESETS: { value: Mode; label: string; sub: string }[] = [
  { value: 'normal', label: 'Нормален ход', sub: 'без нарушения' },
  { value: 'r12s', label: '1₂s', sub: 'една точка > 2 SD' },
  { value: 'r13s', label: '1₃s', sub: 'една точка > 3 SD' },
  { value: 'r22s', label: '2₂s', sub: 'две поредни > 2 SD' },
  { value: 'rR4s', label: 'R₄s', sub: 'размах > 4 SD' },
  { value: 'r41s', label: '4₁s', sub: 'четири > 1 SD' },
  { value: 'r10x', label: '10x', sub: 'десет от една страна' },
  { value: 'random', label: 'Случайни', sub: 'нови измервания' },
];

function baseSeries(mode: Mode, seed: number): number[] {
  if (mode === 'random') {
    const rng = mulberry32(seed);
    return Array.from({ length: N }, () => gaussian(rng));
  }
  const z = CALM.slice();
  switch (mode) {
    case 'r12s':
      z[14] = 2.4;
      break;
    case 'r13s':
      z[17] = 3.4;
      break;
    case 'r22s':
      z[13] = 2.3;
      z[14] = 2.5;
      break;
    case 'rR4s':
      z[18] = 2.4;
      z[19] = -2.3;
      break;
    case 'r41s':
      [1.4, 1.2, 1.6, 1.3].forEach((v, k) => (z[12 + k] = v));
      break;
    case 'r10x':
      [0.4, 0.7, 0.3, 0.8, 0.5, 0.6, 0.9, 0.2, 0.7, 0.5].forEach((v, k) => (z[10 + k] = v));
      break;
    default:
      break;
  }
  return z;
}

type ErrKind = 'shift' | 'trend';

/* ───────── Геометрия ───────── */
const W = 800;
const H = 380;
const PL = 74;
const PR = 700;
const PT = 18;
const PB = 336;
const zy = (z: number) => PT + ((4 - clamp(z, -4, 4)) / 8) * (PB - PT);
const ix = (i: number) => PL + 14 + (i / (N - 1)) * (PR - PL - 28);

const SD_LINES: { z: number; color: string; dash: string; label: string }[] = [
  { z: 3, color: 'var(--bad)', dash: '6 4', label: '+3 SD' },
  { z: 2, color: 'var(--warn)', dash: '6 4', label: '+2 SD' },
  { z: 1, color: 'var(--v-soft)', dash: '2 4', label: '+1 SD' },
  { z: 0, color: 'var(--v-ink)', dash: '', label: 'средна' },
  { z: -1, color: 'var(--v-soft)', dash: '2 4', label: '−1 SD' },
  { z: -2, color: 'var(--warn)', dash: '6 4', label: '−2 SD' },
  { z: -3, color: 'var(--bad)', dash: '6 4', label: '−3 SD' },
];

const ERR_WORD = { random: 'случайна грешка', systematic: 'системна грешка', mixed: 'смесена (случайна и системна) грешка', none: '' } as const;

export function QCDiagram() {
  const uid = useId().replace(/:/g, '');
  const [mode, setMode] = useState<Mode>('normal');
  const [seed, setSeed] = useState(7);
  const [rand, setRand] = useState(1);
  const [kind, setKind] = useState<ErrKind>('shift');
  const [mag, setMag] = useState(0);
  const [start, setStart] = useState(15);
  const [enabled, setEnabled] = useState<Set<RuleId>>(() => new Set(RULES.map((r) => r.id)));
  const [selected, setSelected] = useState<number | null>(null);

  const z = useMemo(() => {
    const base = baseSeries(mode, seed);
    return base.map((v, i) => {
      let out = v * rand;
      if (i >= start - 1) out += kind === 'shift' ? mag : (mag * (i - (start - 1) + 1)) / (N - (start - 1));
      return out;
    });
  }, [mode, seed, rand, kind, mag, start]);

  const violations = useMemo(() => evaluate(z, enabled), [z, enabled]);
  const result = useMemo(() => assess(violations), [violations]);

  const values = z.map((v) => MEAN + v * SD);
  const mu = mean(values);
  const s = sd(values);
  const outside2 = z.filter((v) => Math.abs(v) > 2).length;

  const pointRules = useMemo(() => {
    const m = new Map<number, RuleId[]>();
    violations.forEach((v) => v.points.forEach((p) => m.set(p, [...(m.get(p) ?? []), v.rule])));
    return m;
  }, [violations]);

  const rejectPoint = (i: number) => (pointRules.get(i) ?? []).some((r) => ruleById(r).type === 'reject');
  const warnPoint = (i: number) => pointRules.has(i) && !rejectPoint(i);

  const pickMode = (m: Mode) => {
    setMode(m);
    setRand(1);
    setMag(0);
    setSelected(null);
    if (m === 'random') setSeed((x) => x + 1);
  };

  const toggleRule = (id: RuleId, on: boolean) =>
    setEnabled((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const path = z.map((v, i) => `${i ? 'L' : 'M'}${ix(i).toFixed(1)} ${zy(v).toFixed(1)}`).join('');
  const sel = selected !== null ? selected : null;

  const statusTone = result.status === 'reject' ? 'bad' : result.status === 'warning' ? 'warn' : 'ok';
  const statusTitle =
    result.status === 'reject' ? 'Серията се ОТХВЪРЛЯ' : result.status === 'warning' ? 'Предупреждение – проверка на останалите правила' : 'Няма нарушения – серията е приемлива';

  return (
    <VizFrame
      title="Диаграма на Levey-Jennings и правила на Westgard"
      subtitle="Избери образец или сам добави случайна/системна грешка и наблюдавай как правилата откриват нарушенията."
      icon="lineChart"
      note={`Всички данни са ИЛЮСТРАТИВНИ – условен контролен материал със средна ${fmt(MEAN, 2)} ${UNIT} и SD ${fmt(SD, 2)} ${UNIT}, симулиран с генератор на числа. Не са реални лабораторни резултати. Наборът правила е образователен модел; в лабораторията той се определя от метода и локалната процедура.`}
    >
      <div className="space-y-4">
        <Segmented<Mode> label="Образци на контролните резултати" size="sm" value={mode} onChange={pickMode} options={PRESETS} />

        {/* ───── Диаграма ───── */}
        <div className="overflow-hidden rounded-xl border border-line" style={{ background: 'var(--v-panel)' }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg block h-auto w-full" role="img" aria-label={`Диаграма на Levey-Jennings с ${N} контролни резултата; ${statusTitle}`}>
            <defs>
              <linearGradient id={`${uid}-band`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--bad)" stopOpacity="0.06" />
                <stop offset="0.5" stopColor="var(--ok)" stopOpacity="0.07" />
                <stop offset="1" stopColor="var(--bad)" stopOpacity="0.06" />
              </linearGradient>
            </defs>
            <rect x={PL} y={PT} width={PR - PL} height={PB - PT} fill={`url(#${uid}-band)`} />

            {SD_LINES.map((l) => (
              <g key={l.z}>
                <line x1={PL} x2={PR} y1={zy(l.z)} y2={zy(l.z)} stroke={l.color} strokeWidth={l.z === 0 ? 2 : 1.4} strokeDasharray={l.dash} opacity={l.z === 0 ? 0.9 : 0.8} />
                <Txt x={PR + 8} y={zy(l.z) + 4} size={11} weight={700} color={l.color}>
                  {l.label}
                </Txt>
                <Txt x={PL - 8} y={zy(l.z) + 4} anchor="end" size={10.5} color="var(--v-soft)" mono>
                  {fmt(MEAN + l.z * SD, 2)}
                </Txt>
              </g>
            ))}
            <line x1={PL} x2={PL} y1={PT} y2={PB} stroke="var(--v-soft)" />
            <line x1={PL} x2={PR} y1={PB} y2={PB} stroke="var(--v-soft)" />
            {Array.from({ length: N }, (_, i) => (
              <g key={i}>
                <line x1={ix(i)} x2={ix(i)} y1={PB} y2={PB + 4} stroke="var(--v-soft)" />
                {(i + 1) % 5 === 0 || i === 0 ? (
                  <Txt x={ix(i)} y={PB + 18} anchor="middle" size={10.5} color="var(--v-soft)">
                    {i + 1}
                  </Txt>
                ) : null}
              </g>
            ))}
            <Txt x={(PL + PR) / 2} y={H - 10} anchor="middle" size={11.5} color="var(--v-soft)" weight={600}>
              пореден номер на измерването (контрол)
            </Txt>
            <g transform={`rotate(-90 14 ${(PT + PB) / 2})`}>
              <Txt x={14} y={(PT + PB) / 2} anchor="middle" size={11.5} color="var(--v-soft)" weight={600}>
                резултат, {UNIT}
              </Txt>
            </g>

            {/* начало на системна грешка */}
            {mag !== 0 && (
              <g>
                <line x1={ix(start - 1) - 7} x2={ix(start - 1) - 7} y1={PT} y2={PB} stroke="var(--accent)" strokeDasharray="3 4" opacity={0.8} />
                <Txt x={ix(start - 1) - 3} y={PB - 8} size={10.5} color="var(--accent)" weight={700} halo>
                  {kind === 'shift' ? 'начало на изместването' : 'начало на тренда'}
                </Txt>
              </g>
            )}

            <path d={path} fill="none" stroke="var(--v-ink)" strokeWidth={1.6} opacity={0.55} strokeLinejoin="round" />

            {z.map((v, i) => {
              const rej = rejectPoint(i);
              const warn = warnPoint(i);
              const clipped = Math.abs(v) > 4;
              const isSel = sel === i;
              const x = ix(i);
              const y = zy(v);
              return (
                <g
                  key={i}
                  className="viz-hit"
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSel}
                  aria-label={`Точка ${i + 1}: ${fmt(MEAN + v * SD, 3)} ${UNIT}, ${v >= 0 ? '+' : ''}${fmt(v, 2)} SD${rej ? ', нарушение (отхвърляне)' : warn ? ', предупреждение' : ''}`}
                  onClick={() => setSelected(isSel ? null : i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(isSel ? null : i);
                    }
                  }}
                >
                  <circle cx={x} cy={y} r={14} fill="transparent" />
                  {(rej || warn) && <circle cx={x} cy={y} r={11} fill="none" stroke={rej ? 'var(--bad)' : 'var(--warn)'} strokeWidth={2.4} />}
                  {isSel && <circle cx={x} cy={y} r={14} fill="none" stroke="var(--accent)" strokeWidth={2} strokeDasharray="3 3" />}
                  {clipped ? (
                    <polygon points={`${x},${y - 6} ${x - 6},${y + 5} ${x + 6},${y + 5}`} fill="var(--surface)" stroke={rej ? 'var(--bad)' : 'var(--v-ink)'} strokeWidth={2} transform={v < 0 ? `rotate(180 ${x} ${y})` : undefined} />
                  ) : (
                    <circle cx={x} cy={y} r={5.2} fill={rej ? 'var(--bad)' : warn ? 'var(--warn)' : 'var(--v-antibody)'} stroke="var(--surface)" strokeWidth={1.8} />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {sel !== null && (
          <ExplainPanel eyebrow={`Точка № ${sel + 1}`} title={`${fmt(MEAN + z[sel] * SD, 3)} ${UNIT} · ${z[sel] >= 0 ? '+' : ''}${fmt(z[sel], 2)} SD`} live>
            <p className="!m-0">
              {Math.abs(z[sel]) > 3
                ? 'Извън ±3 SD – много рядко събитие при нормална работа.'
                : Math.abs(z[sel]) > 2
                  ? 'Между 2 и 3 SD – около 5 % от резултатите попадат тук и при нормална работа; значението зависи от съседните точки.'
                  : Math.abs(z[sel]) > 1
                    ? 'Между 1 и 2 SD – напълно обичайно разсейване; само поредица от такива точки е тревожна (4₁s).'
                    : 'В рамките на ±1 SD – типично за около две трети от резултатите.'}
            </p>
            <p className="!m-0 text-sm text-muted">
              {pointRules.has(sel) ? (
                <>Участва в нарушение: {(pointRules.get(sel) ?? []).map((r) => ruleById(r).label).join(', ')}.</>
              ) : (
                <>Не участва в нарушение на включените правила.</>
              )}
            </p>
          </ExplainPanel>
        )}

        {/* ───── Състояние ───── */}
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 ${statusTone === 'bad' ? 'border-bad/40 bg-bad/10' : statusTone === 'warn' ? 'border-warn/40 bg-warn/10' : 'border-ok/40 bg-ok/10'}`}
          role="status"
          aria-live="polite"
        >
          <Icon name={statusTone === 'ok' ? 'check' : 'alert'} size={22} className={`mt-0.5 shrink-0 ${statusTone === 'bad' ? 'text-bad' : statusTone === 'warn' ? 'text-warn' : 'text-ok'}`} />
          <div className="min-w-0 text-[0.95rem] leading-relaxed">
            <p className="!m-0 font-bold text-ink">{statusTitle}</p>
            {result.status === 'reject' && (
              <p className="!m-0 text-sm text-muted">
                Вероятен вид: <strong className="text-ink">{ERR_WORD[result.error]}</strong>. Резултатите на пациентите не се докладват, докато не се установи причината (вж. „Какво се прави при нарушено правило“).
              </p>
            )}
            {result.status === 'warning' && <p className="!m-0 text-sm text-muted">Правилото 1₂s е само предупреждение – не отхвърля серията самò по себе си.</p>}
            {result.status === 'accept' && <p className="!m-0 text-sm text-muted">Резултатите са в очакваното разпределение. Изключените правила не се оценяват.</p>}
          </div>
        </div>

        {/* ───── Симулатор на грешки ───── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
            <p className="!m-0 text-sm font-bold text-ink">Случайна грешка (прецизност)</p>
            <Slider
              id={`${uid}-rand`}
              label="Разсейване спрямо нормалното"
              value={rand}
              min={1}
              max={3.5}
              step={0.1}
              display={`${fmt(rand, 1)}×`}
              hint="Увеличава SD на метода: точките се разпръскват, а средната остава."
              onChange={setRand}
            />
            <p className="!m-0 text-sm font-bold text-ink">Системна грешка (точност)</p>
            <Segmented<ErrKind>
              label="Вид системна грешка"
              size="sm"
              value={kind}
              onChange={setKind}
              options={[
                { value: 'shift', label: 'Изместване (shift)', sub: 'внезапна промяна' },
                { value: 'trend', label: 'Тренд', sub: 'постепенно движение' },
              ]}
            />
            <Slider
              id={`${uid}-mag`}
              label={kind === 'shift' ? 'Големина на изместването' : 'Отклонение в края на серията'}
              value={mag}
              min={-3}
              max={3}
              step={0.1}
              display={`${mag > 0 ? '+' : ''}${fmt(mag, 1)} SD`}
              onChange={setMag}
            />
            <Slider id={`${uid}-start`} label="Започва от точка №" value={start} min={5} max={26} step={1} display={String(start)} onChange={setStart} />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn" onClick={() => pickMode('random')}>
                Нови случайни измервания
              </button>
              <button type="button" className="btn" onClick={() => pickMode('normal')}>
                Нулирай
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
            <p className="!m-0 text-sm font-bold text-ink">Правила на Westgard (включи/изключи)</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {RULES.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface2/50 px-3 py-2">
                  <Toggle id={`${uid}-r-${r.id}`} label={r.label} checked={enabled.has(r.id)} onChange={(v) => toggleRule(r.id, v)} />
                  <span className={`rounded px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide ${r.type === 'reject' ? 'bg-bad/15 text-bad' : 'bg-warn/15 text-warn'}`}>
                    {r.type === 'reject' ? 'отхвърляне' : 'предупр.'}
                  </span>
                </div>
              ))}
            </div>
            <p className="!m-0 text-xs text-muted">Опитай да изключиш правило и виж кои нарушения остават незабелязани – така се вижда за какво служи всяко от тях.</p>
          </div>
        </div>

        {/* ───── Нарушения ───── */}
        <div className="space-y-2">
          <p className="!m-0 text-sm font-bold text-ink">Открити нарушения</p>
          {result.rules.length === 0 ? (
            <p className="!m-0 rounded-xl border border-line bg-surface p-4 text-sm text-muted">Няма нарушения на включените правила.</p>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {result.rules.map((id) => {
                const info = ruleById(id);
                const pts = Array.from(new Set(violations.filter((v) => v.rule === id).flatMap((v) => v.points))).sort((a, b) => a - b);
                return (
                  <li key={id} className={`rounded-xl border p-3 ${info.type === 'reject' ? 'border-bad/35 bg-bad/5' : 'border-warn/35 bg-warn/5'}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-extrabold text-ink">{info.label}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide ${info.type === 'reject' ? 'bg-bad/15 text-bad' : 'bg-warn/15 text-warn'}`}>
                        {info.type === 'reject' ? 'отхвърляне' : 'предупреждение'}
                      </span>
                      {info.error !== 'none' && <span className="text-xs font-semibold text-muted">{info.error === 'random' ? 'случайна грешка' : 'системна грешка'}</span>}
                    </div>
                    <p className="!m-0 mt-1 text-sm text-ink/90">{info.condition}</p>
                    <p className="!m-0 mt-1 text-xs text-muted">{info.meaning}</p>
                    <p className="!m-0 mt-1 text-xs font-semibold text-ink">Точки №: {pts.map((p) => p + 1).join(', ')}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ───── Статистика ───── */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ValuePill label="Целева средна" value={fmt(MEAN, 2)} unit={UNIT} kind="neutral" />
          <ValuePill label="Целево SD" value={fmt(SD, 2)} unit={UNIT} kind="neutral" />
          <ValuePill label="Средна на серията" value={fmt(mu, 3)} unit={UNIT} kind="calculated" />
          <ValuePill label="SD на серията (CV%)" value={`${fmt(s, 3)} (${fmt((s / mu) * 100, 1)} %)`} kind="calculated" />
        </div>
        <p className="!m-0 text-xs leading-relaxed text-muted">
          Точки извън ±2 SD: {outside2} от {N}. Средната и SD на серията се изчисляват от показаните {N} точки – те се различават от целевите, когато има грешка (разсейване ↑ → SD ↑; изместване → средната се мести).
        </p>
      </div>
    </VizFrame>
  );
}

/* ───────── Прецизност и точност – мишени ───────── */
const TARGETS: { title: string; bias: [number, number]; spread: number; seed: number; lj: string; err: string }[] = [
  { title: 'Прецизен и точен', bias: [0, 0], spread: 0.1, seed: 3, lj: 'Точките са тясно групирани около средната.', err: 'Само нормално разсейване' },
  { title: 'Прецизен, но неточен', bias: [0.55, -0.4], spread: 0.1, seed: 5, lj: 'Тясно групирани, но всички от една страна на средната – изместване (shift).', err: 'Системна грешка' },
  { title: 'Непрецизен, но точен', bias: [0, 0], spread: 0.36, seed: 9, lj: 'Голямо разсейване около правилната средна – чести точки извън ±2 SD.', err: 'Случайна грешка' },
  { title: 'Непрецизен и неточен', bias: [-0.45, 0.4], spread: 0.36, seed: 13, lj: 'Разпръснати точки около изместена средна.', err: 'Случайна и системна грешка' },
];

export function AccuracyPrecision() {
  return (
    <VizFrame
      title="Прецизност и точност – мишена"
      subtitle="Центърът на мишената е истинската стойност. Четирите случая показват как се свързват с вида грешка и с диаграмата на контрола."
      icon="target"
      note="Схематична илюстрация със симулирани точки."
    >
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TARGETS.map((t) => {
          const rng = mulberry32(t.seed);
          const pts = Array.from({ length: 10 }, () => [t.bias[0] + gaussian(rng) * t.spread, t.bias[1] + gaussian(rng) * t.spread]);
          return (
            <li key={t.title} className="rounded-xl border border-line bg-surface p-3 text-center">
              <svg viewBox="0 0 120 120" className="viz-svg mx-auto block h-32 w-32" role="img" aria-label={`Мишена: ${t.title}`}>
                {[56, 42, 28, 14].map((r, i) => (
                  <circle key={r} cx={60} cy={60} r={r} fill={i % 2 ? 'var(--v-panel)' : 'var(--v-grid)'} opacity={0.9} stroke="var(--v-soft)" strokeWidth={0.6} />
                ))}
                <circle cx={60} cy={60} r={2} fill="var(--v-ink)" />
                {pts.map((p, i) => (
                  <circle key={i} cx={clamp(60 + p[0] * 40, 6, 114)} cy={clamp(60 + p[1] * 40, 6, 114)} r={3.4} fill="var(--v-hba1c)" stroke="var(--surface)" strokeWidth={1} />
                ))}
              </svg>
              <h4 className="!m-0 mt-1 text-sm font-bold text-ink">{t.title}</h4>
              <p className="!m-0 text-xs font-semibold text-accent">{t.err}</p>
              <p className="!m-0 mt-1 text-xs leading-snug text-muted">{t.lj}</p>
            </li>
          );
        })}
      </ul>
    </VizFrame>
  );
}
