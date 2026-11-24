import { useId, useMemo, useState } from 'react';
import { VizFrame, ExplainPanel, ValuePill } from '../ui/VizFrame';
import { StepControls, Slider, Segmented } from '../ui/Controls';
import { Icon } from '../ui/Icon';
import { RichText } from '../ui/RichText';
import { useStepper } from '../../hooks/useStepper';
import { Txt } from './shared';
import { fmt, linearFit, niceTicks } from '../../lib/stats';

const STAGES: { label: string; title: string; body: string[] }[] = [
  {
    label: 'Стандарти',
    title: 'Приготвяне на стандартите',
    body: [
      'Приготвя се серия от **стандарти с известни концентрации** – обикновено чрез разреждане на концентриран стандартен разтвор – и **нулев стандарт (бланк)**: реагент без аналит.',
      'Точността на пипетирането и разреждането е критична – всяка грешка тук се „вгражда“ в калибрацията.',
    ],
  },
  {
    label: 'Измерване',
    title: 'Измерване на сигнала на всеки стандарт',
    body: [
      'Всеки стандарт се обработва като проба – **същите реагент, обеми, време и температура** – и се измерва абсорбцията. Препоръчително е да се правят повторения.',
      'Бланкът задава нулевата точка (фоновия сигнал).',
    ],
  },
  {
    label: 'Таблица',
    title: 'Таблица „концентрация – сигнал“',
    body: [
      'Резултатите се записват в таблица. **Можеш да редактираш** концентрациите и абсорбциите, за да симулираш грешка при пипетиране или нелинейност и да видиш последствията.',
    ],
  },
  {
    label: 'Крива',
    title: 'Построяване на калибрационната крива',
    body: [
      'Точките се нанасят върху графика (x – концентрация, y – абсорбция). През тях се прекарва най-подходящата права по метода на **най-малките квадрати**: **y = a + b·x**.',
      '**b** е наклонът (чувствителност), **a** – пресечната точка (фон).',
    ],
  },
  {
    label: 'Оценка',
    title: 'Оценка на качеството на кривата',
    body: [
      'Разглеждат се **наклонът**, **пресечната точка**, **r²** и **отклонението на всяка точка** от линията. Точка с голямо отклонение сочи грешка в конкретния стандарт.',
      'Високо r² **не е достатъчно** – разглеждат се и остатъците. Конкретните критерии за приемане са определени от метода.',
    ],
  },
  {
    label: 'Проба',
    title: 'Определяне на концентрацията на неизвестна проба',
    body: [
      'Измерва се абсорбцията на пробата. От стойността на ординатата се отива хоризонтално до линията и вертикално до абсцисата: **x = (y − a) / b**.',
      '**Не се екстраполира** извън обхвата на стандартите – пробата се разрежда и се измерва повторно.',
    ],
  },
];

interface Std {
  c: number;
  a: number;
}

const DEFAULT: Std[] = [
  { c: 0, a: 0.002 },
  { c: 2, a: 0.205 },
  { c: 4, a: 0.398 },
  { c: 6, a: 0.611 },
  { c: 8, a: 0.796 },
];
const SATURATING: Std[] = [
  { c: 0, a: 0.002 },
  { c: 2, a: 0.205 },
  { c: 4, a: 0.38 },
  { c: 6, a: 0.52 },
  { c: 8, a: 0.6 },
];
const OUTLIER: Std[] = [
  { c: 0, a: 0.002 },
  { c: 2, a: 0.205 },
  { c: 4, a: 0.398 },
  { c: 6, a: 0.52 },
  { c: 8, a: 0.796 },
];

const NAMES = ['Бланк', 'Стандарт 1', 'Стандарт 2', 'Стандарт 3', 'Стандарт 4'];

function NumField({ value, onChange, step, label }: { value: number; onChange: (v: number) => void; step: number; label: string }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      value={Number.isFinite(value) ? value : ''}
      aria-label={label}
      onChange={(e) => {
        const v = e.currentTarget.valueAsNumber;
        if (!Number.isNaN(v)) onChange(v);
      }}
      className="w-24 rounded-md border border-line bg-surface px-2 py-1 text-right text-sm tabular-nums text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    />
  );
}

export function CalibrationManual() {
  const uid = useId().replace(/:/g, '');
  const stepper = useStepper(STAGES.length, 6000);
  const stage = stepper.step;
  const s = STAGES[stage];
  const [stds, setStds] = useState<Std[]>(DEFAULT);
  const [aSample, setASample] = useState(0.5);
  const [oneIdx, setOneIdx] = useState(4);

  const fit = useMemo(
    () =>
      linearFit(
        stds.map((x) => x.c),
        stds.map((x) => x.a),
      ),
    [stds],
  );

  const setStd = (i: number, patch: Partial<Std>) => setStds((arr) => arr.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const cMin = Math.min(...stds.map((x) => x.c));
  const cMax = Math.max(...stds.map((x) => x.c));
  const xSample = fit.ok ? (aSample - fit.a) / fit.b : NaN;
  const inRange = Number.isFinite(xSample) && xSample >= cMin - 1e-9 && xSample <= cMax + 1e-9;

  // едноточкова калибрация (с изваждане на бланка)
  const blank = stds[0].a;
  const cal = stds[oneIdx];
  const F = cal.c / (cal.a - blank);
  const xOne = F * (aSample - blank);

  const resid = stds.map((p) => (fit.ok ? p.a - (fit.a + fit.b * p.c) : NaN));
  const flagged = resid.map((r) => Math.abs(r) > 0.03);
  const lowR2 = fit.ok && fit.r2 < 0.995;

  /* ───── графика ───── */
  const W = 560;
  const H = 340;
  const PL = 58;
  const PR = 540;
  const PT = 18;
  const PB = 292;
  const xMax = Math.max(cMax * 1.12, 1);
  const yMax = Math.max(...stds.map((p) => p.a), aSample, 0.2) * 1.18;
  const gx = (c: number) => PL + (c / xMax) * (PR - PL);
  const gy = (a: number) => PB - (a / yMax) * (PB - PT);
  const showPts = stage >= 2;
  const showLine = stage >= 3 && fit.ok;
  const showResid = stage >= 4 && fit.ok;
  const showSample = stage >= 5 && fit.ok;

  return (
    <VizFrame
      title="Ръчна калибрация – стъпка по стъпка"
      subtitle="Приготви стандарти, измери, построй крива и определи неизвестна проба. Стойностите са редактируеми."
      icon="ruler"
      note="Образователна илюстрация с условен аналит и условни единици. Редовите стойности са илюстративни – реалните методи имат собствен брой стандарти, критерии за приемане и обхват."
    >
      <div className="space-y-4">
        <StepControls stepper={stepper} labels={STAGES.map((x) => x.label)} />

        <ExplainPanel eyebrow={`Етап ${stage + 1} от ${STAGES.length}`} title={s.title}>
          {s.body.map((p, i) => (
            <p key={i} className="!m-0">
              <RichText text={p} />
            </p>
          ))}
        </ExplainPanel>

        {/* епруветки */}
        <div className="overflow-hidden rounded-xl border border-line" style={{ background: 'var(--v-panel)' }}>
          <svg viewBox="0 0 560 128" className="viz-svg block h-auto w-full" role="img" aria-label="Серия от пет епруветки със стандарти с нарастваща концентрация">
            {stds.map((p, i) => {
              const x = 56 + i * 112;
              const f = cMax > 0 ? Math.max(0, p.c) / cMax : 0;
              return (
                <g key={i} transform={`translate(${x} 10)`}>
                  <defs>
                    <clipPath id={`${uid}-t${i}`}>
                      <path d="M-14 18 H14 V66 a14 14 0 0 1 -28 0 Z" />
                    </clipPath>
                  </defs>
                  <g clipPath={`url(#${uid}-t${i})`}>
                    <rect x={-16} y={18} width={32} height={70} fill="var(--v-liquid)" />
                    <rect x={-16} y={18} width={32} height={70} fill="var(--v-dye-bound)" opacity={0.12 + 0.55 * f} />
                  </g>
                  <path d="M-14 4 V66 a14 14 0 0 0 28 0 V4" fill="none" stroke="var(--v-glass)" strokeWidth={2.5} strokeLinecap="round" />
                  <Txt x={0} y={102} anchor="middle" size={11} weight={700}>
                    {NAMES[i]}
                  </Txt>
                  <Txt x={0} y={116} anchor="middle" size={10} color="var(--v-soft)" mono>
                    {fmt(p.c, 1)}
                    {stage >= 1 ? ` · A ${fmt(p.a, 3)}` : ''}
                  </Txt>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          {/* таблица */}
          <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="pb-2 text-left text-sm font-bold text-ink">Данни за стандартите</caption>
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                    <th className="py-1.5 pr-2 font-semibold">Стандарт</th>
                    <th className="py-1.5 pr-2 font-semibold">Концентрация</th>
                    <th className="py-1.5 pr-2 font-semibold">Абсорбция</th>
                    {stage >= 4 && <th className="py-1.5 font-semibold">Остатък</th>}
                  </tr>
                </thead>
                <tbody>
                  {stds.map((p, i) => (
                    <tr key={i} className="border-b border-line/60 last:border-0">
                      <th scope="row" className="py-1.5 pr-2 font-semibold text-ink">
                        {NAMES[i]}
                      </th>
                      <td className="py-1.5 pr-2">
                        <NumField value={p.c} step={0.5} label={`Концентрация на ${NAMES[i]}`} onChange={(v) => setStd(i, { c: v })} />
                      </td>
                      <td className="py-1.5 pr-2">
                        {stage >= 1 ? <NumField value={p.a} step={0.005} label={`Абсорбция на ${NAMES[i]}`} onChange={(v) => setStd(i, { a: v })} /> : <span className="text-muted">—</span>}
                      </td>
                      {stage >= 4 && (
                        <td className={`py-1.5 tabular-nums ${flagged[i] ? 'font-bold text-warn' : 'text-muted'}`}>
                          {fmt(resid[i], 3)}
                          {flagged[i] && (
                            <span className="ml-1 inline-block align-middle" title="Голямо отклонение от линията">
                              <Icon name="alert" size={14} />
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="!m-0 text-xs text-muted">Концентрацията е в условни единици (у.е.). Остатък = измерена A − A по линията; отклонение над ±0,03 се отбелязва (илюстративен праг).</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn" onClick={() => setStds(DEFAULT)}>
                Линеен пример
              </button>
              <button type="button" className="btn" onClick={() => setStds(OUTLIER)}>
                Пример с грешна точка
              </button>
              <button type="button" className="btn" onClick={() => setStds(SATURATING)}>
                Нелинеен пример
              </button>
            </div>
          </div>

          {/* графика */}
          <div className="overflow-hidden rounded-xl border border-line" style={{ background: 'var(--v-panel)' }}>
            <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg mx-auto block h-auto w-full max-w-[760px]" role="img" aria-label="Калибрационна крива: абсорбция спрямо концентрация">
              {niceTicks(0, yMax, 5).map((t) => (
                <g key={t}>
                  <line x1={PL} x2={PR} y1={gy(t)} y2={gy(t)} stroke="var(--v-grid)" strokeDasharray={t === 0 ? '' : '3 4'} />
                  <Txt x={PL - 8} y={gy(t) + 4} anchor="end" size={10.5} color="var(--v-soft)" mono>
                    {fmt(t, 2)}
                  </Txt>
                </g>
              ))}
              {niceTicks(0, xMax, 6).map((t) => (
                <g key={t}>
                  <line x1={gx(t)} x2={gx(t)} y1={PB} y2={PB + 5} stroke="var(--v-soft)" />
                  <Txt x={gx(t)} y={PB + 19} anchor="middle" size={10.5} color="var(--v-soft)">
                    {fmt(t, 0)}
                  </Txt>
                </g>
              ))}
              <line x1={PL} x2={PR} y1={PB} y2={PB} stroke="var(--v-soft)" />
              <line x1={PL} x2={PL} y1={PT} y2={PB} stroke="var(--v-soft)" />
              <Txt x={(PL + PR) / 2} y={H - 12} anchor="middle" size={11.5} color="var(--v-soft)" weight={600}>
                концентрация (у.е.)
              </Txt>
              <g transform={`rotate(-90 14 ${(PT + PB) / 2})`}>
                <Txt x={14} y={(PT + PB) / 2} anchor="middle" size={11.5} color="var(--v-soft)" weight={600}>
                  абсорбция A
                </Txt>
              </g>

              {!showPts && (
                <Txt x={(PL + PR) / 2} y={(PT + PB) / 2} anchor="middle" size={13} color="var(--v-soft)" weight={600}>
                  Точките се нанасят от етап 3
                </Txt>
              )}

              {showLine && (
                <line x1={gx(0)} y1={gy(fit.a)} x2={gx(xMax)} y2={gy(fit.a + fit.b * xMax)} stroke="var(--v-dye-bound)" strokeWidth={2.6} />
              )}
              {showResid &&
                stds.map((p, i) => (
                  <line key={i} x1={gx(p.c)} x2={gx(p.c)} y1={gy(p.a)} y2={gy(fit.a + fit.b * p.c)} stroke={flagged[i] ? 'var(--warn)' : 'var(--v-soft)'} strokeWidth={2} />
                ))}
              {showPts &&
                stds.map((p, i) => (
                  <circle key={i} cx={gx(p.c)} cy={gy(p.a)} r={6} fill={showResid && flagged[i] ? 'var(--warn)' : 'var(--v-antibody)'} stroke="var(--surface)" strokeWidth={2} />
                ))}

              {showSample && (
                <g>
                  <line x1={PL} x2={gx(Math.min(Math.max(xSample, 0), xMax))} y1={gy(aSample)} y2={gy(aSample)} stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 4" />
                  {Number.isFinite(xSample) && xSample >= 0 && xSample <= xMax && (
                    <>
                      <line x1={gx(xSample)} x2={gx(xSample)} y1={gy(aSample)} y2={PB} stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 4" />
                      <circle cx={gx(xSample)} cy={gy(aSample)} r={7} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
                      <Txt x={gx(xSample)} y={PB - 8} anchor="middle" size={11.5} weight={800} mono color="var(--accent)">
                        {fmt(xSample, 2)}
                      </Txt>
                    </>
                  )}
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* оценка */}
        {stage >= 3 && fit.ok && (
          <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ValuePill label="Наклон b" value={fmt(fit.b, 4)} kind="calculated" />
              <ValuePill label="Пресечна точка a" value={fmt(fit.a, 4)} kind="calculated" />
              <ValuePill label="r²" value={fmt(fit.r2, 4)} kind="calculated" />
              <ValuePill label="Уравнение" value={`y = ${fmt(fit.a, 3)} + ${fmt(fit.b, 3)}·x`} kind="neutral" />
            </div>
            {stage >= 4 && lowR2 && (
              <p className="!m-0 flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm text-ink">
                <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-warn" />
                <span>
                  r² е по-ниско от обичайно очакваното за линеен метод (праг – според метода). Точките не лежат на права: провери стандартите или методът не е линеен в целия диапазон.
                </span>
              </p>
            )}
            {stage >= 4 && flagged.some(Boolean) && (
              <p className="!m-0 flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm text-ink">
                <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-warn" />
                <span>Отбелязаната точка се отклонява от линията – вероятна грешка при приготвяне или измерване на този стандарт.</span>
              </p>
            )}
          </div>
        )}

        {/* проба */}
        {stage >= 5 && fit.ok && (
          <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
            <Slider
              id={`${uid}-as`}
              label="Измерена абсорбция на неизвестната проба"
              value={aSample}
              min={0.02}
              max={1.1}
              step={0.005}
              display={fmt(aSample, 3)}
              onChange={setASample}
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ValuePill label="Концентрация по кривата" value={fmt(xSample, 2)} unit="у.е." kind="calculated" />
              <ValuePill label="Обхват на стандартите" value={`${fmt(cMin, 1)} – ${fmt(cMax, 1)}`} unit="у.е." kind="neutral" />
            </div>
            {!inRange && (
              <p className="!m-0 flex items-start gap-2 rounded-lg border border-bad/40 bg-bad/10 p-3 text-sm text-ink">
                <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-bad" />
                <span>
                  <strong>Извън обхвата на калибрацията.</strong> Резултатът би бил екстраполация и не е допустим – пробата се разрежда (при необходимост) и се измерва повторно.
                </span>
              </p>
            )}

            <div className="border-t border-line pt-3">
              <p className="!m-0 mb-2 text-sm font-bold text-ink">Едноточкова срещу многоточкова калибрация</p>
              <Segmented
                label="Калибратор за едноточковата калибрация"
                size="sm"
                value={String(oneIdx)}
                onChange={(v) => setOneIdx(Number(v))}
                options={[1, 2, 3, 4].map((i) => ({ value: String(i), label: NAMES[i], sub: `${fmt(stds[i].c, 1)} у.е.` }))}
              />
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ValuePill label="Фактор F = c / (A − A бланк)" value={fmt(F, 3)} kind="calculated" />
                <ValuePill label="Едноточково" value={fmt(xOne, 2)} unit="у.е." kind="calculated" />
                <ValuePill label="Многоточково (крива)" value={fmt(xSample, 2)} unit="у.е." kind="calculated" />
                <ValuePill label="Разлика" value={`${xOne - xSample > 0 ? '+' : ''}${fmt(xOne - xSample, 2)}`} unit="у.е." kind="calculated" />
              </div>
              <p className="!m-0 mt-2 text-xs leading-relaxed text-muted">
                При линеен метод двата подхода съвпадат. Ако зависимостта е нелинейна (опитай „Нелинеен пример“), едноточковата калибрация дава грешка далеч от избрания калибратор – тя <strong>не проверява линейността</strong>.
              </p>
            </div>
          </div>
        )}
      </div>
    </VizFrame>
  );
}
