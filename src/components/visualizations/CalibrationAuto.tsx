import { useEffect, useMemo, useState } from 'react';
import { VizFrame, ExplainPanel, ValuePill } from '../ui/VizFrame';
import { StepControls, Segmented } from '../ui/Controls';
import { Callout } from '../ui/Callout';
import { Icon } from '../ui/Icon';
import { RichText } from '../ui/RichText';
import { useStepper } from '../../hooks/useStepper';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { Arrow, Txt } from './shared';
import { fmt, linearFit, mean, sd } from '../../lib/stats';

const STAGES: { label: string; title: string; body: string[]; active: number }[] = [
  {
    label: 'Зареждане',
    title: 'Зареждане на калибраторите',
    body: [
      'Калибраторите (нулев и с приписани стойности) се **зареждат в анализатора**. Приписаните стойности и лотът се въвеждат – често автоматично чрез баркод.',
      'Анализаторът проверява дали калибраторът е правилен за метода и дали не е с изтекъл срок.',
    ],
    active: 0,
  },
  {
    label: 'Измерване',
    title: 'Автоматично измерване на калибраторите',
    body: [
      'Сондата **взема калибратор и реагент**, смесва ги в реакционна кювета и фотометърът измерва сигнала. Обикновено всеки калибратор се измерва **в повторения**.',
      'Параметрите (обеми, време, температура) се определят от програмата за метода.',
    ],
    active: 1,
  },
  {
    label: 'Обработка',
    title: 'Обработка на сигналите',
    body: [
      'Процесорът **изважда бланка**, усреднява повторенията и изчислява показател за **повторяемост** (CV) между тях.',
      'Лошо съгласие между повторенията е сигнал за проблем (пипетиране, мехурчета, нестабилен реагент).',
    ],
    active: 2,
  },
  {
    label: 'Крива',
    title: 'Изчисляване на кривата / фактора',
    body: [
      'С алгоритъм, определен за метода, анализаторът построява **калибрационна крива** (при линеен метод – права) или изчислява **фактор** и получава **наклон** и **пресечна точка**.',
      'Нелинейните методи (напр. имуноанализи) използват други модели.',
    ],
    active: 2,
  },
  {
    label: 'Критерии',
    title: 'Проверка на критериите за приемане',
    body: [
      'Калибрацията се сравнява с **критерии за приемане**: повторяемост, наклон спрямо предишната калибрация, линейност, ниво на бланка и др.',
      'Критериите и праговете са **определени от производителя на метода** – тук са показани примерни стойности.',
    ],
    active: 3,
  },
  {
    label: 'Решение',
    title: 'Приемане или отхвърляне',
    body: [
      'Ако всички критерии са изпълнени, калибрацията се **записва** със срок на валидност и анализаторът може да измерва пациентски проби (след проверка с контроли).',
      'Ако не – калибрацията се **отхвърля**; нужно е да се установи **причината**, а не просто да се повтори.',
    ],
    active: 4,
  },
];

type Scenario = 'ok' | 'fail';

/** Илюстративни сигнали (два повторения за всеки калибратор). */
const CAL = [
  { name: 'Бланк', c: 0 },
  { name: 'Калибратор 1', c: 2 },
  { name: 'Калибратор 2', c: 5 },
  { name: 'Калибратор 3', c: 8 },
];
const SIGNALS: Record<Scenario, [number, number][]> = {
  ok: [
    [0.011, 0.012],
    [0.213, 0.211],
    [0.512, 0.515],
    [0.81, 0.806],
  ],
  fail: [
    [0.01, 0.013],
    [0.165, 0.158],
    [0.39, 0.452],
    [0.56, 0.575],
  ],
};
const PREV_SLOPE = 0.1; // наклон на предишната калибрация (илюстративно)

const Y_LABELS = ['Калибратори', 'Измерване', 'Процесор', 'Критерии', 'Запис'];

export function CalibrationAuto() {
  const stepper = useStepper(STAGES.length, 6000);
  const stage = stepper.step;
  const s = STAGES[stage];
  const [scenario, setScenario] = useState<Scenario>('ok');
  const reduced = useReducedMotion();

  // „сонда“ – показва кой калибратор се измерва по време на етап 2
  const [probe, setProbe] = useState(0);
  useEffect(() => {
    if (stage !== 1 || reduced) return;
    const id = window.setInterval(() => setProbe((p) => (p + 1) % CAL.length), 900);
    return () => window.clearInterval(id);
  }, [stage, reduced]);

  const calc = useMemo(() => {
    const sig = SIGNALS[scenario];
    const means = sig.map((r) => mean(r));
    const blank = means[0];
    const net = means.map((m) => m - blank);
    const cvs = sig.map((r, i) => (i === 0 ? NaN : (sd(r) / mean(r)) * 100));
    const fit = linearFit(
      CAL.map((x) => x.c),
      net,
    );
    const slopeChange = ((fit.b - PREV_SLOPE) / PREV_SLOPE) * 100;
    const crit = [
      { id: 'cv', label: 'Повторяемост на повторенията', rule: 'CV ≤ 5 %', value: `${fmt(Math.max(...cvs.filter((v) => Number.isFinite(v))), 1)} %`, ok: Math.max(...cvs.filter((v) => Number.isFinite(v))) <= 5 },
      { id: 'slope', label: 'Наклон спрямо предишната калибрация', rule: 'в рамките на ±15 %', value: `${slopeChange > 0 ? '+' : ''}${fmt(slopeChange, 1)} %`, ok: Math.abs(slopeChange) <= 15 },
      { id: 'r2', label: 'Линейност (r²)', rule: 'r² ≥ 0,995', value: fmt(fit.r2, 4), ok: fit.r2 >= 0.995 },
      { id: 'blank', label: 'Ниво на бланка', rule: 'A ≤ 0,050', value: fmt(blank, 3), ok: blank <= 0.05 },
    ];
    return { sig, means, net, cvs, fit, slopeChange, crit, pass: crit.every((c) => c.ok) };
  }, [scenario]);

  const decided = stage === 5;
  const showSignals = stage >= 1;
  const showProcessed = stage >= 2;
  const showFit = stage >= 3;
  const showCrit = stage >= 4;

  return (
    <VizFrame
      title="Апаратна (автоматична) калибрация – работен поток на анализатор"
      subtitle="Шест етапа от зареждането на калибраторите до приемане или отхвърляне. Избери успешен или неуспешен сценарий."
      icon="cpu"
      note="Общ образователен модел. Конкретният работен поток, броят калибратори и повторения, алгоритъмът и критериите за приемане се определят от инструмента и аналитичния метод. Показаните прагове и сигнали са илюстративни."
    >
      <div className="space-y-4">
        <Segmented<Scenario>
          label="Сценарий на калибрацията"
          value={scenario}
          onChange={setScenario}
          options={[
            { value: 'ok', label: 'Успешна калибрация', sub: 'критериите са изпълнени' },
            { value: 'fail', label: 'Неуспешна калибрация', sub: 'напр. влошен калибратор/реактив' },
          ]}
        />

        {/* схема на анализатора */}
        <div className="overflow-hidden rounded-xl border border-line" style={{ background: 'var(--v-panel)' }}>
          <svg viewBox="0 0 780 250" className="viz-svg block h-auto w-full" role="img" aria-label={`Схема на анализатор, етап ${stage + 1}: ${s.title}`}>
            <Txt x={20} y={30} size={15} weight={800}>
              {stage + 1} · {s.label}
            </Txt>
            <Txt x={20} y={48} size={12} color="var(--v-soft)">
              {s.title}
            </Txt>

            {/* 1. Калибратори */}
            <Box x={20} y={70} w={180} h={150} title={Y_LABELS[0]} active={s.active === 0} />
            {CAL.map((c, i) => {
              const cx = 48 + i * 42;
              const active = (stage === 1 && probe === i) || stage === 0;
              return (
                <g key={c.name}>
                  <rect x={cx - 13} y={118} width={26} height={62} rx={7} fill="var(--v-liquid)" stroke="var(--v-glass)" strokeWidth={2.2} />
                  <rect x={cx - 11} y={150 - c.c * 2} width={22} height={28 + c.c * 2} rx={5} fill="var(--v-dye-bound)" opacity={0.15 + c.c * 0.07} />
                  <rect x={cx - 9} y={126} width={18} height={10} rx={2} fill="var(--surface)" stroke="var(--v-ink)" strokeOpacity={0.4} />
                  <Txt x={cx} y={198} anchor="middle" size={9} color="var(--v-soft)" weight={active ? 800 : 600}>
                    {i === 0 ? 'Бл.' : `К${i}`}
                  </Txt>
                  {stage === 0 && (
                    <Txt x={cx} y={211} anchor="middle" size={9} color="var(--v-ink)" mono>
                      {fmt(c.c, 0)}
                    </Txt>
                  )}
                  {stage === 1 && probe === i && <path d={`M${cx} 96 v18 m-6 -6 l6 6 l6 -6`} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" />}
                </g>
              );
            })}

            <Arrow x1={204} y1={145} x2={256} y2={145} animated={stage === 1} />

            {/* 2. Измерване */}
            <Box x={260} y={70} w={210} h={150} title={Y_LABELS[1]} active={s.active === 1} />
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                <rect x={282 + i * 36} y={130} width={22} height={44} rx={5} fill="var(--v-liquid)" stroke="var(--v-glass)" strokeWidth={2} />
                <rect x={284 + i * 36} y={150} width={18} height={22} rx={4} fill="var(--v-dye-bound)" opacity={stage >= 1 ? 0.2 + 0.1 * i : 0.05} />
              </g>
            ))}
            <Txt x={365} y={196} anchor="middle" size={10} color="var(--v-soft)">
              реакционни кювети
            </Txt>
            <Txt x={365} y={210} anchor="middle" size={10} color="var(--v-soft)">
              + фотометър
            </Txt>

            <Arrow x1={474} y1={145} x2={526} y2={145} animated={stage === 2} />

            {/* 3. Процесор */}
            <Box x={530} y={70} w={110} h={150} title={Y_LABELS[2]} active={s.active === 2} />
            <rect x={546} y={108} width={78} height={64} rx={6} fill="var(--v-detector)" />
            <polyline points="552,160 566,148 580,152 596,128 616,118" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={showFit ? 1 : 0.3} />
            <Txt x={585} y={192} anchor="middle" size={10} color="var(--v-soft)">
              крива/фактор
            </Txt>

            <Arrow x1={644} y1={145} x2={672} y2={145} animated={stage === 3} />

            {/* 4–5. Критерии и запис */}
            <Box x={676} y={70} w={90} h={150} title={decided ? 'Решение' : Y_LABELS[3]} active={s.active >= 3} />
            <g transform="translate(721 142)">
              {showCrit && !decided && (
                <g stroke="var(--v-ink)" strokeWidth={2.4} strokeLinecap="round" fill="none">
                  <path d="M-16 -14 h32 M-16 0 h32 M-16 14 h32" opacity={0.5} />
                  <path d="M-22 -14 l2 2 l4 -4" />
                  <path d="M-22 0 l2 2 l4 -4" />
                  <path d="M-22 14 l2 2 l4 -4" />
                </g>
              )}
              {decided && (
                <g>
                  <circle r={26} fill={calc.pass ? 'var(--ok)' : 'var(--bad)'} opacity={0.18} />
                  <circle r={20} fill={calc.pass ? 'var(--ok)' : 'var(--bad)'} />
                  <path d={calc.pass ? 'M-9 0 l6 7 l12 -14' : 'M-8 -8 l16 16 M8 -8 l-16 16'} fill="none" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
                </g>
              )}
              {!showCrit && <Txt x={0} y={4} anchor="middle" size={11} color="var(--v-soft)">…</Txt>}
            </g>
            <Txt x={721} y={206} anchor="middle" size={10} weight={700} color={decided ? (calc.pass ? 'var(--ok)' : 'var(--bad)') : 'var(--v-soft)'}>
              {decided ? (calc.pass ? 'ПРИЕТА' : 'ОТХВЪРЛЕНА') : showCrit ? 'проверка' : ''}
            </Txt>
          </svg>
        </div>

        <StepControls stepper={stepper} labels={STAGES.map((x) => x.label)} />

        <ExplainPanel eyebrow={`Етап ${stage + 1} от ${STAGES.length}`} title={s.title}>
          {s.body.map((p, i) => (
            <p key={i} className="!m-0">
              <RichText text={p} />
            </p>
          ))}
        </ExplainPanel>

        {/* данни */}
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="px-4 pt-3 text-left text-sm font-bold text-ink">Сигнали на калибраторите (илюстративни)</caption>
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2 font-semibold">Калибратор</th>
                <th className="px-4 py-2 font-semibold">Приписана стойност</th>
                <th className="px-4 py-2 font-semibold">Повторение 1 / 2</th>
                <th className="px-4 py-2 font-semibold">Средно − бланк</th>
                <th className="px-4 py-2 font-semibold">CV</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {CAL.map((c, i) => (
                <tr key={c.name} className="border-b border-line/60 last:border-0">
                  <th scope="row" className="px-4 py-2 font-semibold text-ink">
                    {c.name}
                  </th>
                  <td className="px-4 py-2">{fmt(c.c, 1)}</td>
                  <td className="px-4 py-2">{showSignals ? `${fmt(calc.sig[i][0], 3)} / ${fmt(calc.sig[i][1], 3)}` : '—'}</td>
                  <td className="px-4 py-2">{showProcessed ? fmt(calc.net[i], 3) : '—'}</td>
                  <td className={`px-4 py-2 ${showProcessed && i > 0 && calc.cvs[i] > 5 ? 'font-bold text-bad' : ''}`}>{showProcessed && i > 0 ? `${fmt(calc.cvs[i], 1)} %` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showFit && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ValuePill label="Наклон (сигнал / ед.)" value={fmt(calc.fit.b, 4)} kind="calculated" />
            <ValuePill label="Пресечна точка" value={fmt(calc.fit.a, 4)} kind="calculated" />
            <ValuePill label="r²" value={fmt(calc.fit.r2, 4)} kind="calculated" />
            <ValuePill label="Наклон спрямо предишния" value={`${calc.slopeChange > 0 ? '+' : ''}${fmt(calc.slopeChange, 1)}`} unit="%" kind="calculated" />
          </div>
        )}

        {showCrit && (
          <div className="space-y-2 rounded-xl border border-line bg-surface p-4">
            <p className="!m-0 text-sm font-bold text-ink">Критерии за приемане (примерни)</p>
            <ul className="divide-y divide-line/60">
              {calc.crit.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${c.ok ? 'bg-ok/15 text-ok' : 'bg-bad/15 text-bad'}`}>
                    <Icon name={c.ok ? 'check' : 'x'} size={14} />
                  </span>
                  <span className="min-w-0 flex-1 font-semibold text-ink">{c.label}</span>
                  <span className="text-muted">{c.rule}</span>
                  <span className={`font-bold tabular-nums ${c.ok ? 'text-ok' : 'text-bad'}`}>{c.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {decided && (
          <Callout
            tone={calc.pass ? 'info' : 'warning'}
            title={calc.pass ? 'Калибрацията е приета' : 'Калибрацията е отхвърлена'}
            text={
              calc.pass
                ? 'Калибрацията се записва със срок на валидност. Преди пациентски проби се измерват **контролни материали** и резултатите им се оценяват.'
                : 'Анализаторът **не позволява** работа с тази калибрация. Търси се **причината** – калибратор, реактив, пипетиране/мехурчета, апарат – и чак след отстраняването ѝ калибрацията се повтаря. Повтарянето „на сляпо“ не е решение.'
            }
          />
        )}

        <Callout
          tone="verify"
          title="Зависи от инструмента и метода"
          text="Броят на калибраторите, повторенията, моделът на кривата, критериите за приемане и срокът на валидност са определени от **производителя на метода и анализатора**. Показаният поток е общ образователен модел."
        />
      </div>
    </VizFrame>
  );
}

function Box({ x, y, w, h, title, active }: { x: number; y: number; w: number; h: number; title: string; active: boolean }) {
  return (
    <g>
      {active && <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx={14} fill="none" stroke="var(--accent)" strokeWidth={2.5} className="pulse-ring" />}
      <rect x={x} y={y} width={w} height={h} rx={10} fill="var(--surface)" stroke={active ? 'var(--accent)' : 'var(--line)'} strokeWidth={active ? 2.5 : 1.5} />
      <Txt x={x + w / 2} y={y + 20} anchor="middle" size={11.5} weight={800} color={active ? 'var(--accent)' : 'var(--v-ink)'}>
        {title}
      </Txt>
    </g>
  );
}
