import { useId, useState } from 'react';
import { VizFrame, ExplainPanel, ValuePill } from '../ui/VizFrame';
import { StepControls, Slider } from '../ui/Controls';
import { RichText } from '../ui/RichText';
import { useStepper } from '../../hooks/useStepper';
import { useTween } from '../../hooks/useTween';
import { Cuvette, Jig, Txt } from './shared';
import { clamp, fmt, mulberry32 } from '../../lib/stats';

const STAGES: { label: string; title: string; body: string[] }[] = [
  {
    label: 'Проба',
    title: 'Серумна проба с магнезий',
    body: [
      'Пробата е **серум** (или хепаринова плазма). Съдържа магнезий (Mg²⁺ – зелените частици), калций (Ca²⁺ – сивите), протеини и други компоненти.',
      '**EDTA, цитрат и оксалат не се използват** като антикоагуланти за този метод, защото свързват магнезия.',
    ],
  },
  {
    label: 'Реагент',
    title: 'Добавяне на реагента с багрило',
    body: [
      'Добавя се реагент с металохромното багрило **Xylidyl Blue** в алкална среда. Свободното багрило е **синьо** (шестоъгълните частици).',
      'Багрилото е в **излишък** спрямо магнезия, така че количеството на комплекса да зависи от Mg²⁺ в пробата.',
    ],
  },
  {
    label: 'Маскиране',
    title: 'Маскиране на калция',
    body: [
      'Калцият също би реагирал с багрилото. В много реактиви **EGTA маскира Ca²⁺** (сивите йони с оранжев пръстен), за да се измерва предимно магнезият.',
      'Колко ефективно е маскирането, е **специфично за реактива** – вж. листовката.',
    ],
  },
  {
    label: 'Свързване',
    title: 'Mg²⁺ се свързва с багрилото',
    body: [
      'Магнезиевите йони се **свързват чрез хелатна връзка** с молекулите на багрилото и образуват комплекс Mg–багрило.',
      'Колкото повече Mg²⁺ има в пробата, толкова **повече молекули багрило** се свързват.',
    ],
  },
  {
    label: 'Цвят',
    title: 'Промяна на цвета: синьо → червено-виолетово',
    body: [
      'Свързаното багрило **поглъща светлина при друга дължина на вълната** от свободното – цветът преминава от **синьо** към **червено-виолетово**.',
      'Колкото повече комплекс, толкова **по-наситен е новият цвят** (в линейния диапазон на метода).',
    ],
  },
  {
    label: 'Светлина',
    title: 'Светлина през кюветата',
    body: [
      'Спектрофотометърът пропуска светлина през кюветата. Молекулите на комплекса и на свободното багрило **поглъщат** част от нея.',
      'Работната дължина на вълната (или двойка дължини) е **определена от реактива и анализатора** – не е универсална.',
    ],
  },
  {
    label: 'Измерване',
    title: 'Измерване на абсорбцията',
    body: [
      'Измерва се абсорбцията **A = −log₁₀(I / I₀)**. Според закона на Beer-Lambert **A = ε · l · c** – в линейния диапазон абсорбцията е **пропорционална на концентрацията** на поглъщащото вещество.',
      'При тази схема абсорбцията на комплекса расте с концентрацията на магнезия.',
    ],
  },
  {
    label: 'Резултат',
    title: 'Изчисляване на концентрацията',
    body: [
      'Абсорбцията на пробата се сравнява с тази на **бланк** и **калибратор** с известна концентрация: **c = (A проба − A бланк) / (A кал. − A бланк) × c кал.**',
      'Резултатът е в mmol/L. Референтни граници и клинична интерпретация са извън обхвата на тази илюстрация.',
    ],
  },
];

/* ───────── Геометрия ───────── */
const N_MG = 12;
const N_CA = 6;
const N_PR = 5;
const N_DYE = 14;
const MG_OFF = 0;
const CA_OFF = MG_OFF + N_MG * 3;
const PR_OFF = CA_OFF + N_CA * 3;
const DYE_OFF = PR_OFF + N_PR * 3;
const EGTA_OFF = DYE_OFF + N_DYE * 3;
const BOUND_OFF = EGTA_OFF + N_CA; // N_DYE стойности „свързаност“
const LAYER_OFF = BOUND_OFF + N_DYE; // [свободно багрило, комплекс]

const CUV = { x: 262, y: 70, w: 126, h: 214, top: 104 };
const rng = mulberry32(5);
const rnd = (x0: number, x1: number, y0: number, y1: number): [number, number] => [x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0)];
const MG_POS: [number, number][] = Array.from({ length: N_MG }, () => rnd(276, 366, 168, 266));
const CA_POS: [number, number][] = Array.from({ length: N_CA }, () => rnd(276, 372, 160, 270));
const PR_POS: [number, number][] = Array.from({ length: N_PR }, () => rnd(280, 366, 170, 266));
const DYE_HOME: [number, number][] = Array.from({ length: N_DYE }, (_, i) => [276 + (i % 7) * 17, 124 + Math.floor(i / 7) * 20]);

const K_ABS = 0.42; // илюстративна абсорбция на mmol/L
const A_BLANK = 0.02;
const C_CAL = 1.0; // илюстративен калибратор, mmol/L

export const mgAbsorbance = (c: number) => A_BLANK + K_ABS * c;
/** Дял на свързано багрило (за цвета). */
const boundFrac = (c: number) => clamp((c * 6) / N_DYE, 0, 1);

function targets(stage: number, c: number): number[] {
  const nMg = clamp(Math.round(c * 6), 1, N_MG);
  const f = boundFrac(c);
  const t: number[] = [];
  for (let i = 0; i < N_MG; i++) t.push(MG_POS[i][0], MG_POS[i][1], i < nMg ? 1 : 0);
  for (let i = 0; i < N_CA; i++) t.push(CA_POS[i][0], CA_POS[i][1], 1);
  for (let i = 0; i < N_PR; i++) t.push(PR_POS[i][0], PR_POS[i][1], 1);
  for (let i = 0; i < N_DYE; i++) {
    let [x, y] = DYE_HOME[i];
    if (i < nMg && stage >= 3) {
      x = MG_POS[i][0] + 13;
      y = MG_POS[i][1] - 3;
    }
    t.push(x, y, stage >= 1 ? 1 : 0);
  }
  for (let i = 0; i < N_CA; i++) t.push(stage >= 2 ? 1 : 0);
  for (let i = 0; i < N_DYE; i++) t.push(i < nMg && stage >= 4 ? 1 : 0);
  const freeO = stage >= 1 ? 0.55 * (1 - 0.85 * (stage >= 4 ? f : 0)) : 0;
  const boundO = stage >= 4 ? 0.6 * f : 0;
  t.push(freeO, boundO);
  return t;
}

export function MagnesiumDiagram() {
  const uid = useId().replace(/:/g, '');
  const stepper = useStepper(STAGES.length);
  const [conc, setConc] = useState(1.0);
  const stage = stepper.step;
  const s = STAGES[stage];

  const A = mgAbsorbance(conc);
  const Aeff = stage >= 4 ? A : 0.02;
  const T = 10 ** -Aeff;
  const beamOn = stage >= 5;
  const cur = useTween(targets(stage, conc), 3.2);
  const aCal = mgAbsorbance(C_CAL);
  const cCalc = ((A - A_BLANK) / (aCal - A_BLANK)) * C_CAL;

  return (
    <VizFrame
      title="Колориметричен анализ на магнезий с Xylidyl Blue"
      subtitle="Реакцията стъпка по стъпка, сравнение на проби с различна концентрация и закон на Beer-Lambert."
      icon="flask"
      note="Схематична образователна илюстрация. Броят на частиците, цветовете, абсорбциите и калибраторът са илюстративни и не представляват реални данни. Състав на реактива, обеми и дължини на вълната се определят от производителя."
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-line" style={{ background: 'var(--v-panel)' }}>
          <svg viewBox="0 0 780 340" className="viz-svg block h-auto w-full" role="img" aria-label={`Схема на колориметричното определяне на магнезий, етап ${stage + 1}: ${s.title}`}>
            <defs>
              <linearGradient id={`${uid}-beam`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="var(--v-light)" stopOpacity="0.6" />
                <stop offset="1" stopColor="var(--v-light)" stopOpacity={0.6 * T} />
              </linearGradient>
            </defs>

            <Txt x={20} y={34} size={15} weight={800}>
              {stage + 1} · {s.label}
            </Txt>
            <Txt x={20} y={54} size={12} color="var(--v-soft)">
              {s.title}
            </Txt>

            <g opacity={beamOn ? 1 : 0}>
              <rect x={64} y={180} width={198} height={20} fill="var(--v-light)" opacity={0.55} />
              <rect x={CUV.x} y={180} width={CUV.w} height={20} fill={`url(#${uid}-beam)`} />
              <rect x={CUV.x + CUV.w} y={180} width={590 - (CUV.x + CUV.w)} height={20} fill="var(--v-light)" opacity={0.6 * T} />
              <line x1={64} y1={190} x2={590} y2={190} stroke="var(--v-light)" strokeWidth={2} className="beam" />
            </g>

            <rect x={24} y={168} width={40} height={44} rx={7} fill="var(--v-metal)" />
            <circle cx={64} cy={190} r={7} fill="var(--v-light)" opacity={beamOn ? 1 : 0.35} />
            <Txt x={44} y={230} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
              Светлинен
            </Txt>
            <Txt x={44} y={244} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
              източник
            </Txt>

            <Cuvette
              x={CUV.x}
              y={CUV.y}
              w={CUV.w}
              h={CUV.h}
              liquidTop={CUV.top}
              liquid="var(--v-liquid)"
              clipId={`${uid}-clip`}
              label="Кювета с реакционна смес"
              inside={
                <>
                  <rect x={CUV.x} y={CUV.top} width={CUV.w} height={CUV.h} fill="var(--v-dye-free)" opacity={cur[LAYER_OFF]} />
                  <rect x={CUV.x} y={CUV.top} width={CUV.w} height={CUV.h} fill="var(--v-dye-bound)" opacity={cur[LAYER_OFF + 1]} />
                </>
              }
            />

            {/* Протеини */}
            {Array.from({ length: N_PR }, (_, i) => (
              <Jig key={`p${i}`} x={cur[PR_OFF + i * 3]} y={cur[PR_OFF + i * 3 + 1]} opacity={cur[PR_OFF + i * 3 + 2] * 0.75} delay={i * 0.4}>
                <ellipse rx={8} ry={6} fill="var(--v-hb)" opacity={0.55} stroke="var(--v-ink)" strokeOpacity={0.25} />
              </Jig>
            ))}

            {/* Калций + EGTA */}
            {Array.from({ length: N_CA }, (_, i) => (
              <Jig key={`c${i}`} x={cur[CA_OFF + i * 3]} y={cur[CA_OFF + i * 3 + 1]} opacity={cur[CA_OFF + i * 3 + 2]} delay={i * 0.33}>
                <circle r={4.8} fill="var(--v-soft)" />
                <circle r={8.5} fill="none" stroke="var(--v-hapten)" strokeWidth={2} strokeDasharray="3 2" opacity={cur[EGTA_OFF + i]} />
              </Jig>
            ))}

            {/* Магнезий */}
            {Array.from({ length: N_MG }, (_, i) => (
              <Jig key={`m${i}`} x={cur[MG_OFF + i * 3]} y={cur[MG_OFF + i * 3 + 1]} opacity={cur[MG_OFF + i * 3 + 2]} delay={i * 0.21}>
                <circle r={5.5} fill="var(--v-mg)" stroke="var(--v-ink)" strokeOpacity={0.3} strokeWidth={0.8} />
              </Jig>
            ))}

            {/* Багрило */}
            {Array.from({ length: N_DYE }, (_, i) => {
              const b = cur[BOUND_OFF + i];
              return (
                <Jig key={`d${i}`} x={cur[DYE_OFF + i * 3]} y={cur[DYE_OFF + i * 3 + 1]} opacity={cur[DYE_OFF + i * 3 + 2]} delay={i * 0.17}>
                  <polygon points="-7,-4 0,-8 7,-4 7,4 0,8 -7,4" fill="var(--v-dye-free)" stroke="var(--v-ink)" strokeOpacity={0.35} strokeWidth={0.8} />
                  <polygon points="-7,-4 0,-8 7,-4 7,4 0,8 -7,4" fill="var(--v-dye-bound)" opacity={b} />
                </Jig>
              );
            })}

            {/* Спектрофотометър */}
            <rect x={590} y={148} width={104} height={84} rx={9} fill="var(--v-detector)" />
            <rect x={586} y={178} width={9} height={24} rx={2} fill="var(--v-light)" opacity={stage >= 5 ? 0.9 : 0.35} />
            <Txt x={642} y={186} anchor="middle" size={12} color="#ffffff" weight={700} mono opacity={stage >= 6 ? 1 : 0}>
              A = {fmt(A, 3)}
            </Txt>
            <Txt x={642} y={206} anchor="middle" size={11} color="#ffffff" weight={600} mono opacity={stage >= 6 ? 1 : 0}>
              I/I₀ = {fmt(10 ** -A * 100, 0)} %
            </Txt>
            <Txt x={642} y={252} anchor="middle" size={12} weight={600}>
              Спектрофотометър
            </Txt>

            <g opacity={stage === 7 ? 1 : 0} style={{ transition: 'opacity 0.5s' }}>
              <rect x={440} y={14} width={324} height={64} rx={10} fill="var(--surface)" stroke="var(--accent)" strokeWidth={1.8} />
              <Txt x={456} y={36} size={11} color="var(--v-soft)" weight={700}>
                РЕЗУЛТАТ (изчислен спрямо калибратор)
              </Txt>
              <Txt x={456} y={62} size={20} weight={800} mono>
                Mg ≈ {fmt(cCalc, 2)} mmol/L
              </Txt>
            </g>

            <g transform="translate(20 312)">
              <circle cx={6} cy={0} r={5.5} fill="var(--v-mg)" />
              <Txt x={16} y={4} size={11} color="var(--v-soft)">
                Mg²⁺
              </Txt>
              <circle cx={64} cy={0} r={4.8} fill="var(--v-soft)" />
              <Txt x={74} y={4} size={11} color="var(--v-soft)">
                Ca²⁺
              </Txt>
              <polygon points="-7,-4 0,-8 7,-4 7,4 0,8 -7,4" fill="var(--v-dye-free)" transform="translate(130 0)" />
              <Txt x={142} y={4} size={11} color="var(--v-soft)">
                багрило (свободно)
              </Txt>
              <polygon points="-7,-4 0,-8 7,-4 7,4 0,8 -7,4" fill="var(--v-dye-bound)" transform="translate(274 0)" />
              <Txt x={286} y={4} size={11} color="var(--v-soft)">
                комплекс Mg–багрило
              </Txt>
              <circle cx={436} cy={0} r={8} fill="none" stroke="var(--v-hapten)" strokeWidth={2} strokeDasharray="3 2" />
              <Txt x={450} y={4} size={11} color="var(--v-soft)">
                маскиран (EGTA)
              </Txt>
            </g>
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

        <div className="rounded-xl border border-line bg-surface p-4">
          <Slider
            id={`${uid}-mg`}
            label="Условна концентрация на магнезий в пробата"
            value={conc}
            min={0.2}
            max={2.0}
            step={0.05}
            display={`${fmt(conc, 2)} mmol/L`}
            hint="Промени концентрацията – броят на свързаните молекули, цветът и абсорбцията се променят."
            onChange={setConc}
          />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ValuePill label="Абсорбция A" value={fmt(A, 3)} kind="measured" />
            <ValuePill label="Пропусната светлина" value={fmt(10 ** -A * 100, 0)} unit="%" kind="calculated" />
            <ValuePill label="Свързано багрило" value={`${clamp(Math.round(conc * 6), 1, N_MG)} / ${N_DYE}`} kind="neutral" />
            <ValuePill label="Резултат спрямо калибратор" value={fmt(cCalc, 2)} unit="mmol/L" kind="calculated" />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <SampleComparison conc={conc} onPick={setConc} />
          <BeerLambertPlot conc={conc} />
        </div>
      </div>
    </VizFrame>
  );
}

/* ───────── Сравнение на проби с различна концентрация ───────── */
const COMPARE = [
  { label: 'Бланк', c: 0 },
  { label: 'Проба 1', c: 0.5 },
  { label: 'Проба 2', c: 0.8 },
  { label: 'Проба 3', c: 1.2 },
  { label: 'Проба 4', c: 2.0 },
];

function Tube({ c, active }: { c: number; active: boolean }) {
  const f = boundFrac(c);
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 60 120" className="viz-svg mx-auto block h-28 w-auto" aria-hidden>
      <defs>
        <clipPath id={`${id}-t`}>
          <path d="M12 30 H48 V96 a18 18 0 0 1 -36 0 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-t)`}>
        <rect x={0} y={30} width={60} height={90} fill="var(--v-liquid)" />
        <rect x={0} y={30} width={60} height={90} fill="var(--v-dye-free)" opacity={0.55 * (1 - 0.85 * f)} />
        <rect x={0} y={30} width={60} height={90} fill="var(--v-dye-bound)" opacity={0.6 * f} />
      </g>
      <path d="M12 12 V96 a18 18 0 0 0 36 0 V12" fill="none" stroke={active ? 'var(--accent)' : 'var(--v-glass)'} strokeWidth={active ? 3.5 : 2.5} strokeLinecap="round" />
      <line x1={8} x2={52} y1={12} y2={12} stroke={active ? 'var(--accent)' : 'var(--v-glass)'} strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}

function SampleComparison({ conc, onPick }: { conc: number; onPick: (c: number) => void }) {
  const items = [...COMPARE, { label: 'Текуща', c: conc }];
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="!m-0 text-sm font-bold text-ink">Сравнение на проби с различна концентрация</p>
      <p className="!m-0 mb-3 text-xs text-muted">Кликни върху проба, за да зададеш нейната концентрация. По-тъмният червено-виолетов цвят означава повече комплекс и по-висока абсорбция.</p>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {items.map((it, i) => {
          const isCur = i === items.length - 1;
          const A = mgAbsorbance(it.c);
          const active = !isCur && Math.abs(it.c - conc) < 0.026;
          const body = (
            <>
              <Tube c={it.c} active={isCur || active} />
              <span className="mt-1 block text-xs font-bold text-ink">{it.label}</span>
              <span className="block text-[0.7rem] text-muted tabular-nums">{fmt(it.c, 2)} mmol/L</span>
              <span className="block text-[0.7rem] font-semibold text-ink tabular-nums">A = {fmt(A, 3)}</span>
            </>
          );
          return (
            <li key={it.label} className="text-center">
              {isCur || it.c === 0 ? (
                <div className={`rounded-lg border p-1.5 ${isCur ? 'border-accent/50 bg-accent-soft/50' : 'border-line bg-surface2/50'}`}>{body}</div>
              ) : (
                <button
                  type="button"
                  onClick={() => onPick(it.c)}
                  className={`w-full rounded-lg border p-1.5 transition-colors hover:border-accent/60 ${active ? 'border-accent bg-accent-soft/50' : 'border-line bg-surface2/50'}`}
                  aria-label={`${it.label}: ${fmt(it.c, 2)} mmol/L, A = ${fmt(A, 3)}`}
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="!m-0 mt-2 text-xs text-muted">„Бланк“ е реагент без магнезий – служи за нулиране на абсорбцията и не се избира като проба.</p>
    </div>
  );
}

/* ───────── Закон на Beer-Lambert ───────── */
function BeerLambertPlot({ conc }: { conc: number }) {
  const W = 340;
  const H = 236;
  const L = 46;
  const R = 14;
  const Tp = 16;
  const B = 42;
  const cMax = 2.4;
  const aMax = 1.2;
  const px = (c: number) => L + (c / cMax) * (W - L - R);
  const py = (a: number) => Tp + (1 - a / aMax) * (H - Tp - B);
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="!m-0 text-sm font-bold text-ink">Закон на Beer-Lambert: A = ε · l · c</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg mx-auto mt-1 block h-auto w-full max-w-[520px]" role="img" aria-label="Графика на абсорбцията спрямо концентрацията – права линия през началото">
        {[0, 0.4, 0.8, 1.2].map((a) => (
          <g key={a}>
            <line x1={L} x2={W - R} y1={py(a)} y2={py(a)} stroke="var(--v-grid)" />
            <Txt x={L - 6} y={py(a) + 4} anchor="end" size={10} color="var(--v-soft)">
              {fmt(a, 1)}
            </Txt>
          </g>
        ))}
        {[0, 0.5, 1, 1.5, 2].map((c) => (
          <Txt key={c} x={px(c)} y={H - B + 16} anchor="middle" size={10} color="var(--v-soft)">
            {fmt(c, 1)}
          </Txt>
        ))}
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--v-soft)" />
        <line x1={L} x2={L} y1={Tp} y2={H - B} stroke="var(--v-soft)" />
        <line x1={px(0)} y1={py(A_BLANK)} x2={px(cMax)} y2={py(mgAbsorbance(cMax))} stroke="var(--v-dye-bound)" strokeWidth={2.5} />
        {COMPARE.slice(1).map((p) => (
          <circle key={p.c} cx={px(p.c)} cy={py(mgAbsorbance(p.c))} r={4} fill="var(--surface)" stroke="var(--v-dye-bound)" strokeWidth={2} />
        ))}
        <line x1={px(conc)} x2={px(conc)} y1={py(mgAbsorbance(conc))} y2={H - B} stroke="var(--accent)" strokeDasharray="4 4" />
        <line x1={L} x2={px(conc)} y1={py(mgAbsorbance(conc))} y2={py(mgAbsorbance(conc))} stroke="var(--accent)" strokeDasharray="4 4" />
        <circle cx={px(conc)} cy={py(mgAbsorbance(conc))} r={6} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
        <Txt x={(L + W - R) / 2} y={H - 8} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
          концентрация, mmol/L (илюстративно)
        </Txt>
        <g transform={`rotate(-90 12 ${(Tp + H - B) / 2})`}>
          <Txt x={12} y={(Tp + H - B) / 2} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
            абсорбция A
          </Txt>
        </g>
      </svg>
      <p className="!m-0 mt-1 text-xs text-muted">
        Права линия – само в <strong>линейния диапазон</strong> на метода. При много висока концентрация линейността се нарушава и пробата се разрежда.
      </p>
    </div>
  );
}
