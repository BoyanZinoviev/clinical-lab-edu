import { useId, useState } from 'react';
import { VizFrame, ExplainPanel, ValuePill } from '../ui/VizFrame';
import { StepControls, Slider, Segmented, Toggle } from '../ui/Controls';
import { RichText } from '../ui/RichText';
import { useStepper } from '../../hooks/useStepper';
import { useTween } from '../../hooks/useTween';
import { Cuvette, Jig, PhotometerBeam, Txt, beamLevel } from './shared';
import { clamp, fmt, mulberry32 } from '../../lib/stats';

type Mode = 'uv' | 'blue';

/* ───────── Илюстративни параметри на двата метода ───────── */
const MODES: Record<Mode, { blank: number; k: number; lambda: number; beam: string; curve: string; name: string }> = {
  uv: { blank: 0.04, k: 0.38, lambda: 340, beam: 'var(--v-k)', curve: 'var(--v-k)', name: 'Директен UV метод' },
  blue: { blank: 0.05, k: 0.42, lambda: 660, beam: 'var(--v-blood)', curve: 'var(--v-moblue)', name: 'Молибденово синьо' },
};
const C_CAL = 1.5; // илюстративен калибратор, mmol/L
const MGDL = 3.097; // 1 mmol/L фосфор ≈ 3,10 mg/dL
export const phosphorusAbsorbance = (c: number, m: Mode) => MODES[m].blank + MODES[m].k * c;
const calcResult = (a: number, m: Mode) => ((a - MODES[m].blank) / (phosphorusAbsorbance(C_CAL, m) - MODES[m].blank)) * C_CAL;

interface Stage {
  label: (m: Mode) => string;
  title: (m: Mode) => string;
  body: (m: Mode) => string[];
}

const STAGES: Stage[] = [
  {
    label: () => 'Проба',
    title: () => 'Серумна проба с неорганичен фосфат',
    body: () => [
      'Пробата е **серум** (или хепаринова плазма). Неорганичният фосфат в нея е във вид на **ортофосфатни йони** (HPO₄²⁻ и H₂PO₄⁻ – оранжевите частици), заедно с протеини и други компоненти.',
      'Методът определя само **неорганичния** фосфат – не и фосфолипидите и другите органични фосфорни съединения.',
    ],
  },
  {
    label: () => 'Реагент',
    title: () => 'Добавяне на молибдатния реагент',
    body: () => [
      'Добавя се реагент с **амониев молибдат в сярна киселина** (често и с повърхностно активно вещество). Молибдатът (сините квадратчета) е в **излишък** спрямо фосфата.',
      'Реакцията се нарича „с молибденова киселина“, защото в кисела среда молибдатът е във вид на молибденова киселина и полимолибдатни йони.',
    ],
  },
  {
    label: () => 'Киселина',
    title: () => 'Киселата среда подготвя реакцията',
    body: () => [
      'Сярната киселина осигурява **H⁺** (червените точки). Само при ниско pH молибдатът образува **полимолибдатни йони**, способни да включат фосфата.',
      'Киселинността и концентрациите са **подбрани от производителя** – промяната им би променила скоростта и стабилността на комплекса.',
    ],
  },
  {
    label: () => 'Комплекс',
    title: () => 'Образуване на фосфомолибдатен комплекс',
    body: () => [
      'Всеки фосфатен йон се обгражда от молибденови атоми и образува **фосфомолибденова (хетерополи-) киселина** [PMo₁₂O₄₀]³⁻ – на схемата: оранжев център, обкръжен от пръстен от молибден.',
      'Броят на комплексите е **пропорционален на фосфата** в пробата; излишният молибдат остава свободен (избледнелите квадратчета).',
    ],
  },
  {
    label: (m) => (m === 'uv' ? 'Без редукция' : 'Редукция'),
    title: (m) => (m === 'uv' ? 'Нередуциран комплекс – директно измерване' : 'Редукция до молибденово синьо'),
    body: (m) =>
      m === 'uv'
        ? [
            'При **директния UV метод** комплексът **не се редуцира**. Той поглъща силно в **ултравиолетовата** област, затова разтворът остава почти безцветен (много бледо жълт при високи концентрации).',
            'Предимство: **една стъпка** и стабилен сигнал – затова методът е най-разпространен на автоматичните анализатори.',
          ]
        : [
            'При **класическия метод** се добавя **редуктор** (напр. аскорбинова киселина, SnCl₂ или аминонафтолсулфонова киселина – зелените ромбове). Част от Mo(VI) в комплекса се редуцира до Mo(V).',
            'Получава се **хетерополисиня** – „молибденово синьо“ – с интензивен **син** цвят, чийто интензитет е пропорционален на фосфата.',
          ],
  },
  {
    label: () => 'Светлина',
    title: (m) => (m === 'uv' ? 'Ултравиолетов лъч през кюветата' : 'Червена светлина през кюветата'),
    body: (m) =>
      m === 'uv'
        ? [
            'Лъч в **близкия ултравиолетов** диапазон (виолетовият лъч; типично около **340 nm**) преминава през кюветата. Комплексът поглъща част от него.',
            'Дължината на вълната (и втората дължина за бланк) е **определена от производителя** – напр. 340 nm или 365 nm. Кюветата трябва да пропуска тази дължина.',
          ]
        : [
            'Лъч във **видимата червена област** (на схемата ≈ 660 nm) преминава през кюветата. Синият комплекс поглъща част от него.',
            'Дължината на вълната зависи от **редуктора и методиката** – най-често е в червената или близката инфрачервена област.',
          ],
  },
  {
    label: () => 'Измерване',
    title: () => 'Измерване на абсорбцията',
    body: () => [
      'Измерва се абсорбцията **A = −log₁₀(I / I₀)**. Според закона на Beer-Lambert **A = ε · l · c** – в линейния диапазон абсорбцията е **пропорционална на концентрацията** на комплекса, а той – на фосфата.',
      'От измерването се **изважда реагентният бланк**; при мътна проба е нужна и корекция чрез **проба-бланк** (вж. панела под диаграмата).',
    ],
  },
  {
    label: () => 'Резултат',
    title: () => 'Изчисляване на концентрацията',
    body: () => [
      'Абсорбцията на пробата се сравнява с тази на **бланк** и **калибратор**: **c = (A проба − A бланк) / (A кал. − A бланк) × c кал.**',
      'Резултатът е в mmol/L (1 mmol/L ≈ 3,10 mg/dL). Референтни граници и клинична интерпретация са извън обхвата на тази илюстрация.',
    ],
  },
];

/* ───────── Геометрия на сцената ───────── */
const N_P = 10;
const N_MO = 16;
const N_H = 9;
const N_PR = 4;
const N_RED = 6;
const CUV = { x: 262, y: 70, w: 126, h: 214, top: 104 };
const rng = mulberry32(11);
const rnd = (x0: number, x1: number, y0: number, y1: number): [number, number] => [x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0)];
const P_POS: [number, number][] = Array.from({ length: N_P }, (_, i) => [298 + (i % 3) * 33 + (rng() - 0.5) * 8, 160 + Math.floor(i / 3) * 31 + (rng() - 0.5) * 8]);
const MO_POS: [number, number][] = Array.from({ length: N_MO }, () => rnd(278, 370, 134, 266));
const H_POS: [number, number][] = Array.from({ length: N_H }, () => rnd(278, 372, 130, 268));
const PR_POS: [number, number][] = Array.from({ length: N_PR }, () => rnd(282, 366, 168, 264));
const RED_POS: [number, number][] = Array.from({ length: N_RED }, () => rnd(280, 368, 138, 262));

/** Брой видими фосфатни йони за дадена концентрация. */
const countP = (c: number) => clamp(Math.round(c * 3.5), 1, N_P);

// индекси в масива на анимираните стойности
const G = { mo: 0, h: 1, red: 2, ring: 3, blue: 4, yel: 5, layBlue: 6, free: 7, pr: 8, P: 9 };

function targets(stage: number, mode: Mode, c: number): number[] {
  const f = clamp(c / 3, 0, 1);
  const reduced = mode === 'blue' && stage >= 4;
  const t: number[] = [];
  t[G.mo] = stage >= 1 ? 1 : 0;
  t[G.h] = stage >= 2 ? 0.9 : 0;
  t[G.red] = reduced ? 0.95 : 0;
  t[G.ring] = stage >= 3 ? 1 : 0;
  t[G.blue] = reduced ? 1 : 0;
  t[G.yel] = stage >= 3 && !reduced ? 0.07 + 0.13 * f : 0;
  t[G.layBlue] = reduced ? 0.18 + 0.5 * f : 0;
  t[G.free] = stage >= 3 ? 0.35 : 1;
  t[G.pr] = 0.75;
  const nP = countP(c);
  for (let i = 0; i < N_P; i++) t[G.P + i] = i < nP ? 1 : 0;
  return t;
}

export function PhosphorusDiagram() {
  const uid = useId().replace(/:/g, '');
  const stepper = useStepper(STAGES.length);
  const [mode, setMode] = useState<Mode>('uv');
  const [conc, setConc] = useState(1.0);
  const [turb, setTurb] = useState(0.1);
  const [corr, setCorr] = useState(false);
  const stage = stepper.step;
  const s = STAGES[stage];
  const M = MODES[mode];

  const A = phosphorusAbsorbance(conc, mode);
  const colorStage = mode === 'uv' ? 3 : 4;
  const Aeff = stage >= colorStage ? A : M.blank;
  const T = 10 ** -Aeff;
  const beamOn = stage >= 5;
  const cur = useTween(targets(stage, mode, conc), 3.2);
  const cCalc = calcResult(A, mode);
  const nP = countP(conc);

  return (
    <VizFrame
      title="Определяне на фосфор чрез реакция с молибденова киселина"
      subtitle="Реакцията стъпка по стъпка – директен UV метод и молибденово синьо, спектри и влияние на мътността."
      icon="atom"
      note="Схематична образователна илюстрация. Броят на частиците, цветовете, абсорбциите, спектрите и калибраторът са илюстративни и не представляват реални данни. Състав на реактива, обеми и дължини на вълната се определят от производителя."
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-line" style={{ background: 'var(--v-panel)' }}>
          <svg
            viewBox="0 0 780 340"
            className="viz-svg block h-auto w-full"
            role="img"
            aria-label={`Схема на определянето на фосфор с молибденова киселина, метод: ${M.name}, етап ${stage + 1}: ${s.title(mode)}`}
          >
            <Txt x={20} y={34} size={15} weight={800}>
              {stage + 1} · {s.label(mode)}
            </Txt>
            <Txt x={20} y={54} size={12} color="var(--v-soft)">
              {s.title(mode)}
            </Txt>

            {/* Светлинен лъч */}
            <PhotometerBeam uid={uid} T={T} on={beamOn} cuvX={CUV.x} cuvW={CUV.w} color={M.beam} />

            <rect x={24} y={168} width={40} height={44} rx={7} fill="var(--v-metal)" />
            <circle cx={64} cy={190} r={7} fill={M.beam} opacity={beamOn ? 1 : 0.35} />
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
                  <rect x={CUV.x} y={CUV.top} width={CUV.w} height={CUV.h} fill="var(--v-light)" opacity={cur[G.yel]} />
                  <rect x={CUV.x} y={CUV.top} width={CUV.w} height={CUV.h} fill="var(--v-moblue)" opacity={cur[G.layBlue]} />
                </>
              }
            />

            {stage === 4 && (
              <Txt x={325} y={62} anchor="middle" size={11} color="var(--v-soft)" weight={700}>
                {mode === 'uv' ? 'без редукция' : '+ редуктор'}
              </Txt>
            )}

            {/* Протеини */}
            {PR_POS.map(([x, y], i) => (
              <Jig key={`p${i}`} x={x} y={y} opacity={cur[G.pr]} delay={i * 0.4}>
                <ellipse rx={8} ry={6} fill="var(--v-hb)" opacity={0.55} stroke="var(--v-ink)" strokeOpacity={0.25} />
              </Jig>
            ))}

            {/* Свободен молибдат (в излишък) */}
            {MO_POS.map(([x, y], i) => (
              <Jig key={`m${i}`} x={x} y={y} opacity={cur[G.mo] * cur[G.free]} delay={i * 0.19}>
                <rect x={-4.5} y={-4.5} width={9} height={9} rx={2} fill="var(--v-mo)" stroke="var(--v-ink)" strokeOpacity={0.3} strokeWidth={0.8} />
              </Jig>
            ))}

            {/* H⁺ */}
            {H_POS.map(([x, y], i) => (
              <Jig key={`h${i}`} x={x} y={y} opacity={cur[G.h]} delay={i * 0.27}>
                <circle r={3.2} fill="var(--v-blood)" opacity={0.85} />
              </Jig>
            ))}

            {/* Редуктор */}
            {RED_POS.map(([x, y], i) => (
              <Jig key={`r${i}`} x={x} y={y} opacity={cur[G.red]} delay={i * 0.31}>
                <polygon points="0,-5 5,0 0,5 -5,0" fill="var(--v-cl)" stroke="var(--v-ink)" strokeOpacity={0.3} strokeWidth={0.8} />
              </Jig>
            ))}

            {/* Фосфат с пръстен от молибден (комплекс) */}
            {P_POS.map(([x, y], i) => (
              <Jig key={`P${i}`} x={x} y={y} opacity={cur[G.P + i]} delay={i * 0.23}>
                <g opacity={cur[G.ring]}>
                  {Array.from({ length: 6 }, (_, k) => {
                    const a = (k / 6) * Math.PI * 2;
                    return <rect key={k} x={Math.cos(a) * 12 - 3.4} y={Math.sin(a) * 12 - 3.4} width={6.8} height={6.8} rx={1.6} fill="var(--v-mo)" />;
                  })}
                  {Array.from({ length: 6 }, (_, k) => {
                    const a = (k / 6) * Math.PI * 2;
                    return <rect key={`b${k}`} x={Math.cos(a) * 12 - 3.4} y={Math.sin(a) * 12 - 3.4} width={6.8} height={6.8} rx={1.6} fill="var(--v-moblue)" opacity={cur[G.blue]} />;
                  })}
                </g>
                <circle r={5.5} fill="var(--v-na)" stroke="var(--v-ink)" strokeOpacity={0.3} strokeWidth={0.8} />
              </Jig>
            ))}

            {/* Спектрофотометър */}
            <rect x={590} y={148} width={104} height={84} rx={9} fill="var(--v-detector)" />
            <rect x={586} y={178} width={9} height={24} rx={2} fill={M.beam} opacity={stage >= 5 ? 0.3 + 0.7 * beamLevel(T) : 0.35} />
            <Txt x={642} y={167} anchor="middle" size={11} color="#ffffff" weight={600} mono opacity={stage >= 5 ? 1 : 0}>
              λ ≈ {M.lambda} nm
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
              <rect x={440} y={14} width={324} height={64} rx={10} fill="var(--surface)" stroke="var(--accent)" strokeWidth={1.8} />
              <Txt x={456} y={36} size={11} color="var(--v-soft)" weight={700}>
                РЕЗУЛТАТ (изчислен спрямо калибратор)
              </Txt>
              <Txt x={456} y={62} size={16} weight={800} mono>
                P ≈ {fmt(cCalc, 2)} mmol/L ({fmt(cCalc * MGDL, 1)} mg/dL)
              </Txt>
            </g>

            {/* Легенда */}
            <g transform="translate(20 312)">
              <circle cx={6} cy={0} r={5.5} fill="var(--v-na)" />
              <Txt x={16} y={4} size={11} color="var(--v-soft)">
                фосфат
              </Txt>
              <rect x={86} y={-4.5} width={9} height={9} rx={2} fill="var(--v-mo)" />
              <Txt x={101} y={4} size={11} color="var(--v-soft)">
                молибдат
              </Txt>
              <circle cx={186} cy={0} r={3.2} fill="var(--v-blood)" />
              <Txt x={194} y={4} size={11} color="var(--v-soft)">
                H⁺
              </Txt>
              <g transform="translate(244 0) scale(0.6)">
                {Array.from({ length: 6 }, (_, k) => {
                  const a = (k / 6) * Math.PI * 2;
                  return <rect key={k} x={Math.cos(a) * 12 - 3.4} y={Math.sin(a) * 12 - 3.4} width={6.8} height={6.8} rx={1.6} fill="var(--v-mo)" />;
                })}
                <circle r={5.5} fill="var(--v-na)" />
              </g>
              <Txt x={260} y={4} size={11} color="var(--v-soft)">
                комплекс [PMo₁₂O₄₀]³⁻
              </Txt>
              <polygon points="0,-5 5,0 0,5 -5,0" fill="var(--v-cl)" transform="translate(424 0)" />
              <Txt x={434} y={4} size={11} color="var(--v-soft)">
                редуктор
              </Txt>
              <ellipse cx={514} cy={0} rx={8} ry={6} fill="var(--v-hb)" opacity={0.7} />
              <Txt x={528} y={4} size={11} color="var(--v-soft)">
                протеин
              </Txt>
            </g>
          </svg>
        </div>

        <StepControls stepper={stepper} labels={STAGES.map((x) => x.label(mode))} />

        <ExplainPanel eyebrow={`Етап ${stage + 1} от ${STAGES.length}`} title={s.title(mode)}>
          {s.body(mode).map((p, i) => (
            <p key={i} className="!m-0">
              <RichText text={p} />
            </p>
          ))}
        </ExplainPanel>

        <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
          <Segmented<Mode>
            label="Метод на измерване"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'uv', label: 'Директен UV метод', sub: 'без редукция · UV област' },
              { value: 'blue', label: 'Молибденово синьо', sub: 'с редукция · видима област' },
            ]}
          />
          <Slider
            id={`${uid}-p`}
            label="Условна концентрация на фосфор в пробата"
            value={conc}
            min={0.3}
            max={3}
            step={0.05}
            display={`${fmt(conc, 2)} mmol/L`}
            hint="Промени концентрацията – броят на фосфатните йони и комплексите, цветът и абсорбцията се променят."
            onChange={setConc}
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ValuePill label="Абсорбция A" value={fmt(A, 3)} kind="measured" />
            <ValuePill label="Пропусната светлина" value={fmt(10 ** -A * 100, 0)} unit="%" kind="calculated" />
            <ValuePill label="Фосфатни йони (схема)" value={`${nP} / ${N_P}`} kind="neutral" />
            <ValuePill label="Резултат спрямо калибратор" value={fmt(cCalc, 2)} unit="mmol/L" kind="calculated" />
          </div>
        </div>

        <div className="grid gap-4 2xl:grid-cols-2">
          <SpectraPlot conc={conc} mode={mode} />
          <TurbidityPanel conc={conc} mode={mode} turb={turb} onTurb={setTurb} corr={corr} onCorr={setCorr} uid={uid} />
        </div>
      </div>
    </VizFrame>
  );
}

/* ───────── Схематични спектри ───────── */
const gUv = (l: number) => 1 / (1 + Math.exp((l - 370) / 32)) / (1 / (1 + Math.exp((340 - 370) / 32)));
const gBlue = (l: number) => Math.exp(-(((l - 700) / 95) ** 2)) / Math.exp(-(((660 - 700) / 95) ** 2));

function SpectraPlot({ conc, mode }: { conc: number; mode: Mode }) {
  const W = 340;
  const H = 236;
  const L = 46;
  const R = 14;
  const Tp = 16;
  const B = 42;
  const x0 = 300;
  const x1 = 900;
  const aMax = 1.6;
  const px = (l: number) => L + ((l - x0) / (x1 - x0)) * (W - L - R);
  const py = (a: number) => Tp + (1 - clamp(a, 0, aMax) / aMax) * (H - Tp - B);
  const sig = (m: Mode) => MODES[m].k * conc;
  const path = (m: Mode) => {
    const g = m === 'uv' ? gUv : gBlue;
    let d = '';
    for (let l = x0; l <= x1; l += 6) d += `${d ? ' L' : 'M'}${px(l).toFixed(1)} ${py(sig(m) * g(l)).toFixed(1)}`;
    return d;
  };
  const act = MODES[mode];
  const ya = py(sig(mode));
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="!m-0 text-sm font-bold text-ink">Схематични спектри на двата комплекса</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg mx-auto mt-1 block h-auto w-full max-w-[440px]" role="img" aria-label="Схематични спектри на абсорбция на нередуцирания комплекс (UV) и на молибденово синьо (видима област)">
        {[0, 0.4, 0.8, 1.2, 1.6].map((a) => (
          <g key={a}>
            <line x1={L} x2={W - R} y1={py(a)} y2={py(a)} stroke="var(--v-grid)" />
            <Txt x={L - 6} y={py(a) + 4} anchor="end" size={10} color="var(--v-soft)">
              {fmt(a, 1)}
            </Txt>
          </g>
        ))}
        {[300, 400, 500, 600, 700, 800, 900].map((l) => (
          <Txt key={l} x={px(l)} y={H - B + 16} anchor="middle" size={10} color="var(--v-soft)">
            {l}
          </Txt>
        ))}
        <line x1={px(400)} x2={px(400)} y1={Tp} y2={H - B} stroke="var(--v-grid)" strokeDasharray="2 3" />
        <line x1={px(700)} x2={px(700)} y1={Tp} y2={H - B} stroke="var(--v-grid)" strokeDasharray="2 3" />
        <Txt x={px(350)} y={Tp + 11} anchor="middle" size={10} color="var(--v-soft)" weight={700}>
          UV
        </Txt>
        <Txt x={px(550)} y={Tp + 11} anchor="middle" size={10} color="var(--v-soft)" weight={700}>
          видима светлина
        </Txt>
        <Txt x={px(800)} y={Tp + 11} anchor="middle" size={10} color="var(--v-soft)" weight={700}>
          близка IR
        </Txt>
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--v-soft)" />
        <line x1={L} x2={L} y1={Tp} y2={H - B} stroke="var(--v-soft)" />

        <path d={path(mode === 'uv' ? 'blue' : 'uv')} fill="none" stroke={MODES[mode === 'uv' ? 'blue' : 'uv'].curve} strokeWidth={1.8} strokeDasharray="5 4" opacity={0.5} />
        <path d={path(mode)} fill="none" stroke={act.curve} strokeWidth={2.8} />

        <line x1={px(act.lambda)} x2={px(act.lambda)} y1={ya} y2={H - B} stroke="var(--accent)" strokeDasharray="4 4" />
        <circle cx={px(act.lambda)} cy={ya} r={5.5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
        <Txt x={px(act.lambda) + (mode === 'uv' ? 9 : -9)} y={ya - 8} anchor={mode === 'uv' ? 'start' : 'end'} size={10} color="var(--accent)" weight={700} halo>
          {act.lambda} nm
        </Txt>

        <Txt x={(L + W - R) / 2} y={H - 8} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
          дължина на вълната, nm
        </Txt>
        <g transform={`rotate(-90 12 ${(Tp + H - B) / 2})`}>
          <Txt x={12} y={(Tp + H - B) / 2} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
            абсорбция A (без бланк)
          </Txt>
        </g>
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded" style={{ background: MODES.uv.curve }} /> нередуциран комплекс (UV)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded" style={{ background: MODES.blue.curve }} /> молибденово синьо
        </span>
      </div>
      <p className="!m-0 mt-1 text-xs text-muted">
        Формите са <strong>схематични</strong>: нередуцираният комплекс поглъща най-силно в UV, а редуцираният – във видимата и близката инфрачервена област. Реалните спектри и работната дължина на вълната зависят от реактива.
      </p>
      <div className="mt-3 grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-px overflow-hidden rounded-lg border border-line bg-line text-xs" role="table" aria-label="Сравнение на двата метода">
        {(
          [
            ['', 'Директен UV', 'Молибденово синьо'],
            ['Редукция', 'не', 'да – с редуктор'],
            ['Реагенти', 'един реагент', 'молибдат + редуктор'],
            ['Област', 'ултравиолетова', 'видима (червена)'],
            ['Пример за λ', `≈ ${MODES.uv.lambda} nm`, `≈ ${MODES.blue.lambda} nm`],
            ['Разтвор', 'почти безцветен', 'син'],
          ] as const
        ).map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              role={r === 0 || c === 0 ? 'columnheader' : 'cell'}
              className={`px-2 py-1.5 ${r === 0 || c === 0 ? 'font-bold text-ink' : 'text-muted'} ${c > 0 && ((c === 1 && mode === 'uv') || (c === 2 && mode === 'blue')) ? 'bg-accent-soft/60 !text-ink' : 'bg-surface'}`}
            >
              {cell}
            </div>
          )),
        )}
      </div>
    </div>
  );
}

/* ───────── Калибрационна права и влияние на мътността ───────── */
function TurbidityPanel({
  conc,
  mode,
  turb,
  onTurb,
  corr,
  onCorr,
  uid,
}: {
  conc: number;
  mode: Mode;
  turb: number;
  onTurb: (v: number) => void;
  corr: boolean;
  onCorr: (v: boolean) => void;
  uid: string;
}) {
  const W = 340;
  const H = 236;
  const L = 46;
  const R = 14;
  const Tp = 16;
  const B = 42;
  const cMax = 3.2;
  const aMax = 1.6;
  const px = (c: number) => L + (c / cMax) * (W - L - R);
  const py = (a: number) => Tp + (1 - a / aMax) * (H - Tp - B);

  const M = MODES[mode];
  const dA = turb * (mode === 'uv' ? 1 : 0.4); // мътността разсейва по-силно при къси дължини на вълната
  const aTrue = phosphorusAbsorbance(conc, mode);
  const aMeas = aTrue + dA;
  const aUsed = aMeas - (corr ? dA : 0);
  const result = calcResult(aUsed, mode);
  const err = result - conc;
  const signed = (v: number) => `${v > 0.004 ? '+' : ''}${fmt(v, 2)}`;
  const aCal = phosphorusAbsorbance(C_CAL, mode);
  const showShift = dA > 0.0001 && !corr;

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="!m-0 text-sm font-bold text-ink">Калибрационна права и влияние на мътността</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg mx-auto mt-1 block h-auto w-full max-w-[440px]" role="img" aria-label="Калибрационна права на абсорбцията спрямо концентрацията с отбелязани истинска и измерена стойност на мътна проба">
        {[0, 0.4, 0.8, 1.2, 1.6].map((a) => (
          <g key={a}>
            <line x1={L} x2={W - R} y1={py(a)} y2={py(a)} stroke="var(--v-grid)" />
            <Txt x={L - 6} y={py(a) + 4} anchor="end" size={10} color="var(--v-soft)">
              {fmt(a, 1)}
            </Txt>
          </g>
        ))}
        {[0, 0.5, 1, 1.5, 2, 2.5, 3].map((c) => (
          <Txt key={c} x={px(c)} y={H - B + 16} anchor="middle" size={10} color="var(--v-soft)">
            {fmt(c, 1)}
          </Txt>
        ))}
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--v-soft)" />
        <line x1={L} x2={L} y1={Tp} y2={H - B} stroke="var(--v-soft)" />

        <line x1={px(0)} y1={py(M.blank)} x2={px(cMax)} y2={py(phosphorusAbsorbance(cMax, mode))} stroke={M.curve} strokeWidth={2.5} />
        <rect x={px(C_CAL) - 4.5} y={py(aCal) - 4.5} width={9} height={9} fill="var(--surface)" stroke={M.curve} strokeWidth={2} />
        <Txt x={px(C_CAL) + 8} y={py(aCal) + 14} size={10} color="var(--v-soft)" weight={600} halo>
          калибратор
        </Txt>

        {showShift && (
          <>
            <line x1={px(conc)} x2={px(conc)} y1={py(aTrue)} y2={py(aMeas)} stroke="var(--warn)" strokeWidth={2} strokeDasharray="3 3" />
            <line x1={L} x2={px(conc)} y1={py(aMeas)} y2={py(aMeas)} stroke="var(--warn)" strokeDasharray="4 4" />
            <line x1={px(result)} x2={px(result)} y1={py(aMeas)} y2={H - B} stroke="var(--warn)" strokeDasharray="4 4" />
            <circle cx={px(conc)} cy={py(aMeas)} r={5.5} fill="var(--surface)" stroke="var(--warn)" strokeWidth={2.5} />
            <polygon points={`${px(result)},${H - B - 1} ${px(result) - 5},${H - B + 8} ${px(result) + 5},${H - B + 8}`} fill="var(--warn)" />
          </>
        )}
        <line x1={px(conc)} x2={px(conc)} y1={py(aTrue)} y2={H - B} stroke="var(--accent)" strokeDasharray="4 4" />
        <circle cx={px(conc)} cy={py(aTrue)} r={6} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />

        <Txt x={(L + W - R) / 2} y={H - 8} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
          концентрация, mmol/L (илюстративно)
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
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: 'var(--warn)' }} /> измерена мътна проба
        </span>
      </div>

      <div className="mt-3 space-y-3">
        <Slider
          id={`${uid}-t`}
          label="Условна мътност на пробата (ΔA)"
          value={turb}
          min={0}
          max={0.3}
          step={0.01}
          display={`ΔA = ${fmt(turb, 2)}`}
          hint="Мътност (напр. парапротеин или липемия) добавя фалшива абсорбция."
          onChange={onTurb}
        />
        <Toggle id={`${uid}-corr`} label="Корекция чрез проба-бланк" checked={corr} onChange={onCorr} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <ValuePill label="Истинска" value={fmt(conc, 2)} unit="mmol/L" kind="neutral" />
          <ValuePill label="Изчислен резултат" value={fmt(result, 2)} unit="mmol/L" kind="calculated" />
          <ValuePill label="Отклонение" value={signed(err)} unit="mmol/L" kind="calculated" />
        </div>
      </div>
      <p className="!m-0 mt-2 text-xs text-muted">
        Мътността разсейва светлината по-силно при къси дължини на вълната, затова влиянието ѝ е по-голямо в <strong>UV метода</strong> (илюстративно). Проба-бланкът изважда фона и връща резултата към истинската стойност.
      </p>
    </div>
  );
}
