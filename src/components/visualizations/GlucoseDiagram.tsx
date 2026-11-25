import { useId, useState } from 'react';
import { VizFrame, ExplainPanel, ValuePill } from '../ui/VizFrame';
import { StepControls, Slider } from '../ui/Controls';
import { RichText } from '../ui/RichText';
import { useStepper } from '../../hooks/useStepper';
import { useTween } from '../../hooks/useTween';
import { Cuvette, Jig, PhotometerBeam, Txt, beamLevel } from './shared';
import { clamp, fmt, mulberry32 } from '../../lib/stats';

/* ───────── Илюстративни параметри на метода ───────── */
const BLANK = 0.04; // абсорбция на реагентния бланк
const C_CAL = 5.55; // илюстративен калибратор, mmol/L (= 100 mg/dL)
const K = 0.38 / C_CAL; // абсорбция на mmol/L (условна, в линейния диапазон)
const LIN = 20; // условна горна граница на линейност, mmol/L
const LAMBDA = 505; // типична дължина на вълната, nm
const MGDL = 18.02; // 1 mmol/L глюкоза ≈ 18,02 mg/dL
const TAU = 1.5; // условна времева константа на развитие на цвета, min
const GLY = 0.06; // условен спад на глюкозата при гликолиза, дял на час

/** Абсорбция на пълно развитият цвят: линейна до LIN, после се изкривява (изчерпване на кислорода). */
const aReal = (c: number) => (c <= LIN ? BLANK + K * c : BLANK + K * (LIN + (c - LIN) * 0.4));
const A_CAL = BLANK + K * C_CAL;
const calcResult = (a: number) => Math.max(0, ((a - BLANK) / (A_CAL - BLANK)) * C_CAL);

interface Stage {
  label: string;
  title: string;
  body: string[];
}

const STAGES: Stage[] = [
  {
    label: 'Проба',
    title: 'Плазмена проба с глюкоза',
    body: [
      'Пробата е **плазма** (или серум). Глюкозата (оранжевите шестоъгълници) е разтворена в нея заедно с протеини и други компоненти.',
      'Методът е **специфичен за D-глюкозата** – другите захари почти не реагират. Броят на молекулите на схемата е условен и расте с концентрацията.',
    ],
  },
  {
    label: 'Реагент',
    title: 'Добавяне на единичния реагент',
    body: [
      'Реагентът съдържа **глюкозооксидаза** (GOD – лилавите), **пероксидаза** (POD – зелените), безцветния **хромоген** (4-аминоантипирин + фенол – сивите двойки) и буфер. Ензимите и хромогенът са в **излишък**.',
      'Разтвореният **кислород** (сините кръгчета) е втори реагент на първата реакция.',
    ],
  },
  {
    label: 'Инкубация',
    title: 'Смесване и термостатиране',
    body: [
      'Сместа се хомогенизира и се държи при **постоянна температура** за времето, определено от производителя. Реакцията започва веднага след смесването.',
      'Времето е нужно, за да се превърне цялата глюкоза и цветът да достигне **плато** (вж. кривата под диаграмата).',
    ],
  },
  {
    label: 'Окисление',
    title: 'Глюкозооксидазата образува H₂O₂',
    body: [
      'GOD окислява **β-D-глюкозата** с кислород: на всяка молекула глюкоза се образуват **една молекула H₂O₂** (тюркоазените кръгчета) и **глюконова киселина** (малките квадрати).',
      'Разтворът още е почти безцветен – H₂O₂ не се вижда. Част от кислорода се изразходва; при много висока глюкоза той може да стане лимитиращ.',
    ],
  },
  {
    label: 'Багрило',
    title: 'Пероксидазата оцветява хромогена',
    body: [
      'POD използва H₂O₂, за да окисли и свърже 4-аминоантипирина и фенола в **червено хинонеимино багрило** (розовите кръгове). Пероксидът се изразходва; на схемата – едно багрило на две молекули H₂O₂.',
      'Количеството на багрилото е **пропорционално на глюкозата** – разтворът добива червен оттенък, по-наситен при по-висока концентрация.',
    ],
  },
  {
    label: 'Светлина',
    title: 'Светлинен лъч през кюветата',
    body: [
      'Лъч във видимата област (на схемата ≈ 505 nm) преминава през кюветата; червеното багрило поглъща част от него. Цветът на лъча на схемата е условен.',
      'Дължината на вълната е **определена от реактива и анализатора** (най-често между 500 и 550 nm). Измерва се и реагентен бланк.',
    ],
  },
  {
    label: 'Измерване',
    title: 'Измерване на абсорбцията',
    body: [
      'Измерва се абсорбцията **A = −log₁₀(I / I₀)**. Според закона на Beer-Lambert **A = ε · l · c** – в линейния диапазон абсорбцията е **пропорционална на концентрацията** на багрилото, а тя – на глюкозата.',
      'Измерването е по **крайна точка** – след като цветът е достигнал плато. От стойността се изважда реагентният бланк.',
    ],
  },
  {
    label: 'Резултат',
    title: 'Изчисляване на концентрацията',
    body: [
      'Абсорбцията на пробата се сравнява с тази на **бланк** и **калибратор**: **c = (A проба − A бланк) / (A кал. − A бланк) × c кал.**',
      'Резултатът е в mmol/L (1 mmol/L ≈ 18,02 mg/dL). Референтни граници и клинична интерпретация са извън обхвата на тази илюстрация.',
    ],
  },
];

/* ───────── Форми на частиците ───────── */
const hexPts = (r: number) =>
  Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 3) * k + Math.PI / 6;
    return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
  }).join(' ');

function GlucoseShape({ r = 6.8 }: { r?: number }) {
  return <polygon points={hexPts(r)} fill="var(--v-na)" stroke="var(--v-ink)" strokeOpacity={0.3} strokeWidth={0.8} />;
}
function O2Shape() {
  return <circle r={3.4} fill="none" stroke="var(--v-dye-free)" strokeWidth={2} />;
}
function Enzyme({ color, label }: { color: string; label: string }) {
  return (
    <g>
      <rect x={-14} y={-8} width={28} height={16} rx={8} fill={color} opacity={0.88} stroke="var(--v-ink)" strokeOpacity={0.3} strokeWidth={0.8} />
      <Txt x={0} y={3} size={8} anchor="middle" color="#ffffff" weight={800}>
        {label}
      </Txt>
    </g>
  );
}
function ChromogenShape() {
  return (
    <g>
      <circle cx={-3.2} cy={0} r={2.8} fill="var(--v-glass)" />
      <circle cx={3.2} cy={0} r={2.8} fill="var(--v-glass)" opacity={0.75} />
    </g>
  );
}
function H2O2Shape() {
  return <circle r={3.8} fill="var(--v-antibody)" stroke="var(--v-ink)" strokeOpacity={0.25} strokeWidth={0.7} />;
}
function AcidShape() {
  return <rect x={-3.4} y={-3.4} width={6.8} height={6.8} rx={1.5} fill="var(--v-mo)" />;
}
function DyeShape() {
  return <circle r={6.5} fill="var(--v-quino)" stroke="var(--v-ink)" strokeOpacity={0.3} strokeWidth={0.8} />;
}

/* ───────── Геометрия на сцената ───────── */
const N_G = 10;
const N_D = 5;
const N_CH = 8;
const N_PR = 4;
const CUV = { x: 262, y: 70, w: 126, h: 214, top: 104 };
const rng = mulberry32(23);
const rnd = (x0: number, x1: number, y0: number, y1: number): [number, number] => [x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0)];
const G_POS: [number, number][] = Array.from({ length: N_G }, (_, i) => [298 + (i % 3) * 33 + (rng() - 0.5) * 8, 160 + Math.floor(i / 3) * 31 + (rng() - 0.5) * 8]);
const H_POS: [number, number][] = G_POS.map(([x, y]) => [x + 9, y - 8]);
const AC_POS: [number, number][] = G_POS.map(([x, y]) => [x - 9, y + 8]);
const D_POS: [number, number][] = [0, 2, 4, 6, 8].map((i) => [G_POS[i][0], G_POS[i][1] - 4]);
const GOD_POS: [number, number][] = [
  [292, 146],
  [348, 202],
  [300, 254],
];
const POD_POS: [number, number][] = [
  [350, 146],
  [296, 204],
  [350, 256],
];
const CH_POS: [number, number][] = Array.from({ length: N_CH }, () => rnd(280, 368, 136, 264));
const O_POS: [number, number][] = Array.from({ length: 8 }, () => rnd(278, 372, 132, 268));
const PR_POS: [number, number][] = Array.from({ length: N_PR }, () => rnd(282, 366, 168, 264));

const countG = (c: number) => clamp(Math.round(c * 0.7), 1, N_G);

// индекси в масива на анимираните стойности
const G = { enz: 0, o2: 1, chromo: 2, overlay: 3, pr: 4, gluc: 5, h2o2: 5 + N_G, acid: 5 + 2 * N_G, dye: 5 + 3 * N_G };

function targets(stage: number, conc: number): number[] {
  const f = clamp((aReal(conc) - BLANK) / 1.2, 0, 1);
  const nG = countG(conc);
  const nD = Math.ceil(nG / 2);
  const t: number[] = [];
  t[G.enz] = stage >= 1 ? 1 : 0;
  t[G.o2] = stage >= 1 ? (stage >= 3 ? 0.45 : 0.9) : 0;
  t[G.chromo] = stage >= 1 ? (stage >= 4 ? 0.3 : 0.95) : 0;
  t[G.overlay] = stage >= 4 ? 0.08 + 0.55 * f : 0;
  t[G.pr] = 0.75;
  for (let i = 0; i < N_G; i++) {
    t[G.gluc + i] = i < nG ? (stage >= 3 ? 0.08 : 1) : 0;
    t[G.h2o2 + i] = i < nG ? (stage === 3 ? 1 : stage >= 4 ? 0.1 : 0) : 0;
    t[G.acid + i] = i < nG && stage >= 3 ? 0.9 : 0;
  }
  for (let i = 0; i < N_D; i++) t[G.dye + i] = i < nD && stage >= 4 ? 1 : 0;
  return t;
}

export function GlucoseDiagram() {
  const uid = useId().replace(/:/g, '');
  const stepper = useStepper(STAGES.length);
  const [conc, setConc] = useState(5.5);
  const [tInc, setTInc] = useState(8);
  const [dRed, setDRed] = useState(0);
  const [hours, setHours] = useState(0);
  const stage = stepper.step;
  const s = STAGES[stage];

  const A = aReal(conc);
  const Aeff = stage >= 4 ? A : BLANK;
  const T = 10 ** -Aeff;
  const beamOn = stage >= 5;
  const cur = useTween(targets(stage, conc), 3.2);
  const cCalc = calcResult(A);
  const nG = countG(conc);

  return (
    <VizFrame
      title="Определяне на глюкоза по метода GOD-POD"
      subtitle="Реакцията стъпка по стъпка – глюкозооксидаза, пероксидаза и хромоген; развитие на цвета, калибрация, интерференции и гликолиза."
      icon="flask"
      note="Схематична образователна илюстрация. Броят на частиците, цветовете, абсорбциите, времената, границата на линейност и скоростта на гликолизата са илюстративни и не представляват реални данни. Състав на реактива, времена и дължини на вълната се определят от производителя. Цветът на светлинния лъч е условен."
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-line" style={{ background: 'var(--v-panel)' }}>
          <svg
            viewBox="0 0 780 360"
            className="viz-svg block h-auto w-full"
            role="img"
            aria-label={`Схема на определянето на глюкоза по метода GOD-POD, етап ${stage + 1}: ${s.title}`}
          >
            <Txt x={20} y={34} size={15} weight={800}>
              {stage + 1} · {s.label}
            </Txt>
            <Txt x={20} y={54} size={12} color="var(--v-soft)">
              {s.title}
            </Txt>

            {/* Светлинен лъч */}
            <PhotometerBeam uid={uid} T={T} on={beamOn} cuvX={CUV.x} cuvW={CUV.w} dense="var(--v-light-lo)" />

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
              inside={<rect x={CUV.x} y={CUV.top} width={CUV.w} height={CUV.h} fill="var(--v-blood)" opacity={cur[G.overlay]} />}
            />

            {(stage === 1 || stage === 2) && (
              <Txt x={325} y={62} anchor="middle" size={11} color="var(--v-soft)" weight={700}>
                {stage === 1 ? '+ реагент' : 'термостатиране'}
              </Txt>
            )}

            {/* Протеини */}
            {PR_POS.map(([x, y], i) => (
              <Jig key={`p${i}`} x={x} y={y} opacity={cur[G.pr]} delay={i * 0.4}>
                <ellipse rx={8} ry={6} fill="var(--v-hb)" opacity={0.55} stroke="var(--v-ink)" strokeOpacity={0.25} />
              </Jig>
            ))}

            {/* Хромоген (4-аминоантипирин + фенол) */}
            {CH_POS.map(([x, y], i) => (
              <Jig key={`c${i}`} x={x} y={y} opacity={cur[G.chromo]} delay={i * 0.21}>
                <ChromogenShape />
              </Jig>
            ))}

            {/* Кислород */}
            {O_POS.map(([x, y], i) => (
              <Jig key={`o${i}`} x={x} y={y} opacity={cur[G.o2]} delay={i * 0.17}>
                <O2Shape />
              </Jig>
            ))}

            {/* Ензими */}
            {GOD_POS.map(([x, y], i) => (
              <Jig key={`g${i}`} x={x} y={y} opacity={cur[G.enz]} delay={i * 0.5}>
                <Enzyme color="var(--v-k)" label="GOD" />
              </Jig>
            ))}
            {POD_POS.map(([x, y], i) => (
              <Jig key={`d${i}`} x={x} y={y} opacity={cur[G.enz]} delay={i * 0.5 + 0.2}>
                <Enzyme color="var(--v-cl)" label="POD" />
              </Jig>
            ))}

            {/* Глюкоза и продукти */}
            {G_POS.map(([x, y], i) => (
              <Jig key={`gl${i}`} x={x} y={y} opacity={cur[G.gluc + i]} delay={i * 0.23}>
                <GlucoseShape />
              </Jig>
            ))}
            {AC_POS.map(([x, y], i) => (
              <Jig key={`ac${i}`} x={x} y={y} opacity={cur[G.acid + i]} delay={i * 0.29}>
                <AcidShape />
              </Jig>
            ))}
            {H_POS.map(([x, y], i) => (
              <Jig key={`h${i}`} x={x} y={y} opacity={cur[G.h2o2 + i]} delay={i * 0.31}>
                <H2O2Shape />
              </Jig>
            ))}
            {D_POS.map(([x, y], i) => (
              <Jig key={`dy${i}`} x={x} y={y} opacity={cur[G.dye + i]} delay={i * 0.37}>
                <DyeShape />
              </Jig>
            ))}

            {/* Спектрофотометър */}
            <rect x={590} y={148} width={104} height={84} rx={9} fill="var(--v-detector)" />
            <rect x={586} y={178} width={9} height={24} rx={2} fill="var(--v-light)" opacity={stage >= 5 ? 0.3 + 0.7 * beamLevel(T) : 0.35} />
            <Txt x={642} y={167} anchor="middle" size={11} color="#ffffff" weight={600} mono opacity={stage >= 5 ? 1 : 0}>
              λ ≈ {LAMBDA} nm
            </Txt>
            <Txt x={642} y={187} anchor="middle" size={12} color="#ffffff" weight={700} mono opacity={stage >= 6 ? 1 : 0}>
              A = {fmt(A, 3)}
            </Txt>
            <Txt x={642} y={207} anchor="middle" size={11} color="#ffffff" weight={600} mono opacity={stage >= 6 ? 1 : 0}>
              I/I₀ = {fmt(10 ** -A * 100, 0)} %
            </Txt>
            <Txt x={642} y={252} anchor="middle" size={12} weight={600}>
              Спектрофотометър
            </Txt>

            <g opacity={stage === 7 ? 1 : 0} style={{ transition: 'opacity 0.5s' }}>
              <rect x={420} y={14} width={344} height={64} rx={10} fill="var(--surface)" stroke="var(--accent)" strokeWidth={1.8} />
              <Txt x={436} y={36} size={11} color="var(--v-soft)" weight={700}>
                РЕЗУЛТАТ (изчислен спрямо калибратор)
              </Txt>
              <Txt x={436} y={62} size={16} weight={800} mono>
                Глюкоза ≈ {fmt(cCalc, 1)} mmol/L ({fmt(cCalc * MGDL, 0)} mg/dL)
              </Txt>
            </g>

            {/* Легенда */}
            <g transform="translate(20 322)">
              <g transform="translate(7 0)">
                <GlucoseShape r={5.5} />
              </g>
              <Txt x={20} y={4} size={11} color="var(--v-soft)">
                глюкоза
              </Txt>
              <g transform="translate(106 0)">
                <O2Shape />
              </g>
              <Txt x={116} y={4} size={11} color="var(--v-soft)">
                O₂
              </Txt>
              <g transform="translate(168 0) scale(0.75)">
                <Enzyme color="var(--v-k)" label="GOD" />
              </g>
              <Txt x={184} y={4} size={11} color="var(--v-soft)">
                глюкозооксидаза
              </Txt>
              <g transform="translate(314 0) scale(0.75)">
                <Enzyme color="var(--v-cl)" label="POD" />
              </g>
              <Txt x={330} y={4} size={11} color="var(--v-soft)">
                пероксидаза
              </Txt>
              <g transform="translate(438 0)">
                <ChromogenShape />
              </g>
              <Txt x={450} y={4} size={11} color="var(--v-soft)">
                хромоген (4-AAP + фенол)
              </Txt>
            </g>
            <g transform="translate(20 342)">
              <g transform="translate(6 0)">
                <H2O2Shape />
              </g>
              <Txt x={16} y={4} size={11} color="var(--v-soft)">
                H₂O₂
              </Txt>
              <g transform="translate(88 0)">
                <AcidShape />
              </g>
              <Txt x={98} y={4} size={11} color="var(--v-soft)">
                глюконова киселина
              </Txt>
              <g transform="translate(234 0)">
                <DyeShape />
              </g>
              <Txt x={246} y={4} size={11} color="var(--v-soft)">
                червено багрило
              </Txt>
              <ellipse cx={362} cy={0} rx={8} ry={6} fill="var(--v-hb)" opacity={0.7} />
              <Txt x={376} y={4} size={11} color="var(--v-soft)">
                протеин
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

        <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
          <Slider
            id={`${uid}-c`}
            label="Условна концентрация на глюкоза в пробата"
            value={conc}
            min={1}
            max={25}
            step={0.5}
            display={`${fmt(conc, 1)} mmol/L`}
            hint="Промени концентрацията – броят на глюкозните молекули, цветът и абсорбцията се променят. Над условната граница на линейност (≈ 20 mmol/L) връзката спира да е линейна."
            onChange={setConc}
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ValuePill label="Абсорбция A" value={fmt(A, 3)} kind="measured" />
            <ValuePill label="Пропусната светлина" value={fmt(10 ** -A * 100, 0)} unit="%" kind="calculated" />
            <ValuePill label="Глюкозни молекули (схема)" value={`${nG} / ${N_G}`} kind="neutral" />
            <ValuePill label="Резултат спрямо калибратор" value={fmt(cCalc, 1)} unit="mmol/L" kind="calculated" />
          </div>
          {conc > LIN && (
            <p className="!m-0 rounded-lg border border-line bg-surface2/70 px-3 py-2 text-xs text-muted">
              <strong className="text-ink">Над условната граница на линейност.</strong> Абсорбцията вече не расте пропорционално и резултатът е занижен – в практиката пробата се <strong>разрежда</strong> и се измерва отново.
            </p>
          )}
        </div>

        <div className="grid gap-4 2xl:grid-cols-2">
          <TimeCourse conc={conc} t={tInc} onT={setTInc} uid={uid} />
          <CalibrationPanel conc={conc} dRed={dRed} onRed={setDRed} hours={hours} onHours={setHours} uid={uid} />
        </div>
      </div>
    </VizFrame>
  );
}

/* ───────── Развитие на цвета във времето ───────── */
function TimeCourse({ conc, t, onT, uid }: { conc: number; t: number; onT: (v: number) => void; uid: string }) {
  const W = 340;
  const H = 236;
  const L = 46;
  const R = 14;
  const Tp = 16;
  const B = 42;
  const tMax = 12;
  const aInf = aReal(conc);
  const aMax = aInf <= 0.5 ? 0.6 : aInf <= 1.1 ? 1.2 : 1.6;
  const px = (m: number) => L + (m / tMax) * (W - L - R);
  const py = (a: number) => Tp + (1 - clamp(a, 0, aMax) / aMax) * (H - Tp - B);
  const frac = (m: number) => 1 - Math.exp(-m / TAU);
  const aAt = (m: number) => BLANK + (aInf - BLANK) * frac(m);
  let d = '';
  for (let m = 0; m <= tMax + 0.001; m += 0.25) d += `${d ? ' L' : 'M'}${px(m).toFixed(1)} ${py(aAt(m)).toFixed(1)}`;
  const res = calcResult(aAt(t));
  const resPlateau = calcResult(aInf);
  const early = frac(t) < 0.97;

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="!m-0 text-sm font-bold text-ink">Развитие на цвета във времето</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg mx-auto mt-1 block h-auto w-full max-w-[440px]" role="img" aria-label="Крива на нарастване на абсорбцията във времето до плато, с отбелязано избраното време на измерване">
        {[0, 0.25, 0.5, 0.75, 1].map((q) => (
          <g key={q}>
            <line x1={L} x2={W - R} y1={py(q * aMax)} y2={py(q * aMax)} stroke="var(--v-grid)" />
            <Txt x={L - 6} y={py(q * aMax) + 4} anchor="end" size={10} color="var(--v-soft)">
              {fmt(q * aMax, 2)}
            </Txt>
          </g>
        ))}
        {[0, 2, 4, 6, 8, 10, 12].map((m) => (
          <Txt key={m} x={px(m)} y={H - B + 16} anchor="middle" size={10} color="var(--v-soft)">
            {m}
          </Txt>
        ))}
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--v-soft)" />
        <line x1={L} x2={L} y1={Tp} y2={H - B} stroke="var(--v-soft)" />

        <line x1={L} x2={W - R} y1={py(aInf)} y2={py(aInf)} stroke="var(--v-soft)" strokeDasharray="4 4" />
        <Txt x={W - R - 4} y={py(aInf) - 6} anchor="end" size={10} color="var(--v-soft)" weight={700} halo>
          плато
        </Txt>
        <path d={d} fill="none" stroke="var(--v-quino)" strokeWidth={2.8} />
        <line x1={px(t)} x2={px(t)} y1={py(aAt(t))} y2={H - B} stroke="var(--accent)" strokeDasharray="4 4" />
        <circle cx={px(t)} cy={py(aAt(t))} r={5.5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />

        <Txt x={(L + W - R) / 2} y={H - 8} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
          време от смесването, min (илюстративно)
        </Txt>
        <g transform={`rotate(-90 12 ${(Tp + H - B) / 2})`}>
          <Txt x={12} y={(Tp + H - B) / 2} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
            абсорбция A
          </Txt>
        </g>
      </svg>

      <div className="mt-3 space-y-3">
        <Slider
          id={`${uid}-t`}
          label="Време до измерването"
          value={t}
          min={0.5}
          max={12}
          step={0.5}
          display={`${fmt(t, 1)} min`}
          hint="Измерването по крайна точка е вярно само след като цветът е достигнал плато."
          onChange={onT}
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <ValuePill label="Развит цвят" value={fmt(frac(t) * 100, 0)} unit="%" kind="calculated" />
          <ValuePill label="Абсорбция A в момента" value={fmt(aAt(t), 3)} kind="measured" />
          <ValuePill label="Резултат при това време" value={fmt(res, 1)} unit="mmol/L" kind="calculated" />
        </div>
        {early && (
          <p className="!m-0 rounded-lg border border-line bg-surface2/70 px-3 py-2 text-xs text-muted">
            <strong className="text-ink">Цветът още не е достигнал плато.</strong> Резултатът ({fmt(res, 1)} mmol/L) е по-нисък от този при пълно развитие ({fmt(resPlateau, 1)} mmol/L), ако калибрацията е направена при плато.
          </p>
        )}
      </div>
      <p className="!m-0 mt-2 text-xs text-muted">
        Кривата е <strong>условен модел</strong> – реалното време за достигане на плато зависи от реактива, температурата и концентрацията и се определя от производителя.
      </p>
    </div>
  );
}

/* ───────── Калибрационна права, интерференция и гликолиза ───────── */
function CalibrationPanel({
  conc,
  dRed,
  onRed,
  hours,
  onHours,
  uid,
}: {
  conc: number;
  dRed: number;
  onRed: (v: number) => void;
  hours: number;
  onHours: (v: number) => void;
  uid: string;
}) {
  const W = 340;
  const H = 236;
  const L = 46;
  const R = 14;
  const Tp = 16;
  const B = 42;
  const cMax = 26;
  const aMax = 1.6;
  const px = (c: number) => L + (c / cMax) * (W - L - R);
  const py = (a: number) => Tp + (1 - clamp(a, 0, aMax) / aMax) * (H - Tp - B);

  const cEff = conc * (1 - GLY) ** hours;
  const aTrue = aReal(conc);
  const aMeas = Math.max(0, aReal(cEff) - dRed);
  const result = calcResult(aMeas);
  const err = result - conc;
  const signed = (v: number) => `${v > 0.04 ? '+' : ''}${fmt(v, 1)}`;
  const showShift = Math.abs(aMeas - aTrue) > 0.0005;
  const xRead = (aMeas - BLANK) / K;

  let real = '';
  for (let c = 0; c <= cMax + 0.001; c += 0.5) real += `${real ? ' L' : 'M'}${px(c).toFixed(1)} ${py(aReal(c)).toFixed(1)}`;

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="!m-0 text-sm font-bold text-ink">Калибрационна права, интерференция и гликолиза</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg mx-auto mt-1 block h-auto w-full max-w-[440px]" role="img" aria-label="Калибрационна права на абсорбцията спрямо концентрацията на глюкоза с отбелязани истинска и измерена стойност при интерференция или гликолиза">
        {[0, 0.4, 0.8, 1.2, 1.6].map((a) => (
          <g key={a}>
            <line x1={L} x2={W - R} y1={py(a)} y2={py(a)} stroke="var(--v-grid)" />
            <Txt x={L - 6} y={py(a) + 4} anchor="end" size={10} color="var(--v-soft)">
              {fmt(a, 1)}
            </Txt>
          </g>
        ))}
        {[0, 5, 10, 15, 20, 25].map((c) => (
          <Txt key={c} x={px(c)} y={H - B + 16} anchor="middle" size={10} color="var(--v-soft)">
            {c}
          </Txt>
        ))}
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--v-soft)" />
        <line x1={L} x2={L} y1={Tp} y2={H - B} stroke="var(--v-soft)" />

        <line x1={px(LIN)} x2={px(LIN)} y1={Tp} y2={H - B} stroke="var(--v-grid)" strokeDasharray="2 3" />
        <Txt x={px(LIN) - 4} y={Tp + 11} anchor="end" size={10} color="var(--v-soft)" weight={700}>
          граница на линейност
        </Txt>

        {/* Калибрационна права (линейна) и реален отговор */}
        <line x1={px(0)} y1={py(BLANK)} x2={px(cMax)} y2={py(BLANK + K * cMax)} stroke="var(--v-soft)" strokeWidth={1.8} strokeDasharray="5 4" />
        <path d={real} fill="none" stroke="var(--v-quino)" strokeWidth={2.8} />
        <rect x={px(C_CAL) - 4.5} y={py(A_CAL) - 4.5} width={9} height={9} fill="var(--surface)" stroke="var(--v-quino)" strokeWidth={2} />
        <Txt x={px(C_CAL) + 8} y={py(A_CAL) + 16} size={10} color="var(--v-soft)" weight={600} halo>
          калибратор
        </Txt>

        {showShift && (
          <>
            <line x1={px(conc)} x2={px(conc)} y1={py(aTrue)} y2={py(aMeas)} stroke="var(--warn)" strokeWidth={2} strokeDasharray="3 3" />
            <line x1={px(conc)} x2={px(xRead)} y1={py(aMeas)} y2={py(aMeas)} stroke="var(--warn)" strokeDasharray="4 4" />
            <line x1={px(xRead)} x2={px(xRead)} y1={py(aMeas)} y2={H - B} stroke="var(--warn)" strokeDasharray="4 4" />
            <circle cx={px(conc)} cy={py(aMeas)} r={5.5} fill="var(--surface)" stroke="var(--warn)" strokeWidth={2.5} />
            <polygon points={`${px(xRead)},${H - B - 1} ${px(xRead) - 5},${H - B + 8} ${px(xRead) + 5},${H - B + 8}`} fill="var(--warn)" />
          </>
        )}
        <line x1={px(conc)} x2={px(conc)} y1={py(aTrue)} y2={H - B} stroke="var(--accent)" strokeDasharray="4 4" />
        <circle cx={px(conc)} cy={py(aTrue)} r={6} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />

        <Txt x={(L + W - R) / 2} y={H - 8} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
          концентрация на глюкоза, mmol/L (илюстративно)
        </Txt>
        <g transform={`rotate(-90 12 ${(Tp + H - B) / 2})`}>
          <Txt x={12} y={(Tp + H - B) / 2} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
            абсорбция A
          </Txt>
        </g>
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--accent)' }} /> истинска проба
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: 'var(--warn)' }} /> измерена проба
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded" style={{ background: 'var(--v-soft)' }} /> калибрационна права
        </span>
      </div>

      <div className="mt-3 space-y-3">
        <Slider
          id={`${uid}-r`}
          label="Условно редуциращо вещество в пробата (ΔA)"
          value={dRed}
          min={0}
          max={0.15}
          step={0.005}
          display={`ΔA = −${fmt(dRed, 3)}`}
          hint="Редуцират H₂O₂ или багрилото – цветът е по-слаб и резултатът е занижен."
          onChange={onRed}
        />
        <Slider
          id={`${uid}-h`}
          label="Време на стоене преди отделяне на плазмата"
          value={hours}
          min={0}
          max={4}
          step={0.25}
          display={`${fmt(hours, 2)} h`}
          hint="Кръвните клетки продължават да изразходват глюкоза (гликолиза) – условно 6 % на час."
          onChange={onHours}
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <ValuePill label="Истинска" value={fmt(conc, 1)} unit="mmol/L" kind="neutral" />
          <ValuePill label="Изчислен резултат" value={fmt(result, 1)} unit="mmol/L" kind="calculated" />
          <ValuePill label="Отклонение" value={signed(err)} unit="mmol/L" kind="calculated" />
        </div>
      </div>
      <p className="!m-0 mt-2 text-xs text-muted">
        И двата ефекта <strong>занижават</strong> резултата: интерферентът – чрез по-слаб цвят, гликолизата – чрез реално по-малко глюкоза в епруветката. Надеждният резултат изисква бързо отделяне на плазмата или тръба с инхибитор и реактив без чувствителност към интерферентите в пробата.
      </p>
    </div>
  );
}
