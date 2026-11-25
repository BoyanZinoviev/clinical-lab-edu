import { useId, useState } from 'react';
import { VizFrame, ExplainPanel, ValuePill } from '../ui/VizFrame';
import { StepControls, Slider, Segmented, Toggle } from '../ui/Controls';
import { RichText } from '../ui/RichText';
import { useStepper } from '../../hooks/useStepper';
import { useTween } from '../../hooks/useTween';
import { Cuvette, Jig, PhotometerBeam, Txt, beamLevel } from './shared';
import { clamp, fmt, mulberry32 } from '../../lib/stats';

type Mode = 'kin' | 'end';

/* ───────── Илюстративни параметри на метода ───────── */
const BLANK = 0.12; // собствена абсорбция на реагента (жълт пикрат) при работната дължина на вълната
const KC = 0.002964; // условна абсорбция на µmol/L креатинин при пълно развитие на цвета
const TAU_C = 150; // условна времева константа на реакцията с креатинин, s
const F_AMP = 0.3; // условен принос на бързо реагиращи вещества (при максимално ниво), А
const TAU_F = 8; // s
const S_AMP = 0.25; // условен принос на бавно реагиращи вещества (при максимално ниво), А
const TAU_S = 400; // s
const T1 = 30; // s – първо отчитане (кинетичен метод)
const T2 = 90; // s – второ отчитане (кинетичен метод)
const T_END = 300; // s – единично отчитане (крайна точка), условно
const C_CAL = 177; // илюстративен стандарт, µmol/L (= 2,0 mg/dL)
const COMP = 26; // примерна компенсация, µmol/L
const UMOL = 88.4; // µmol/L в 1 mg/dL
const LAMBDA = 510; // типична дължина на вълната, nm

const gC = (t: number) => 1 - Math.exp(-t / TAU_C);
const aCrea = (c: number, t: number) => KC * c * gC(t);
const aFast = (F: number, t: number) => F * F_AMP * (1 - Math.exp(-t / TAU_F));
const aSlow = (S: number, t: number) => S * S_AMP * (1 - Math.exp(-t / TAU_S));
/** Пълна абсорбция в момент t. */
const aTot = (c: number, t: number, F: number, S: number) => BLANK + aCrea(c, t) + aFast(F, t) + aSlow(S, t);

/** Отчетена величина: ΔA (кинетичен) или нетна A (крайна точка). */
function reading(mode: Mode, c: number, F: number, S: number) {
  return mode === 'kin' ? aTot(c, T2, F, S) - aTot(c, T1, F, S) : aTot(c, T_END, F, S) - BLANK;
}
/** Отчетена величина за стандарта (без интерференти). */
const readingCal = (mode: Mode) => reading(mode, C_CAL, 0, 0);
const calcResult = (mode: Mode, r: number) => Math.max(0, (r / readingCal(mode)) * C_CAL);

interface Stage {
  label: (m: Mode) => string;
  title: (m: Mode) => string;
  body: (m: Mode) => string[];
}

const STAGES: Stage[] = [
  {
    label: () => 'Проба',
    title: () => 'Серумна проба с креатинин',
    body: () => [
      'Пробата е **серум** (или плазма). Креатининът (зелените кръгчета) е разтворен в нея заедно с протеини (розовите елипси) и други компоненти.',
      'Ако увеличиш нивото на **бързо реагиращите** вещества в панела под диаграмата, на схемата се появяват **кетони** (червените триъгълници).',
    ],
  },
  {
    label: () => 'Реагент',
    title: () => 'Добавяне на алкалния пикрат',
    body: () => [
      'Добавя се реагент с **пикрат** (жълтите квадрати) в **силно алкална среда** (сините кръгчета са OH⁻). Разтворът е жълт – това е собственият цвят на пикрата.',
      'Пикратът е в **излишък** спрямо креатинина. Състав и концентрации – по производителя.',
    ],
  },
  {
    label: () => 'Смесване',
    title: () => 'Смесване – старт на времето',
    body: (m) => [
      'Сместа се хомогенизира и се термостатира. От този момент започва отброяването на времето (**t = 0**) – скоростта на реакцията е важна за резултата.',
      m === 'kin'
        ? 'При **кинетичния метод** абсорбцията ще се отчита в два точно определени момента (A₁ и A₂), затова времето е критично.'
        : 'При **измерване по крайна точка** абсорбцията се отчита веднъж – след определено време.',
    ],
  },
  {
    label: () => 'Комплекс',
    title: () => 'Образуване на оцветения комплекс',
    body: () => [
      'Креатининът реагира с пикрата в алкална среда и образува **червено-оранжев комплекс** (оранжевите квадрати със зелен „възел“) – комплекс от типа на Janovsky. Броят му е **пропорционален на креатинина**.',
      'Бързо реагиращите вещества (напр. кетони – червените триъгълници) реагират още в първите секунди; бавно реагиращите (напр. протеини – оранжев ореол) – постепенно.',
    ],
  },
  {
    label: (m) => (m === 'kin' ? 'Прозорец' : 'Отчитане'),
    title: (m) => (m === 'kin' ? 'Времеви прозорец между A₁ и A₂' : 'Единично отчитане по крайна точка'),
    body: (m) =>
      m === 'kin'
        ? [
            'Абсорбцията се отчита около **30 s** (A₁) и около **90 s** (A₂) след добавяне на пробата (примерни стойности – по листовката). **ΔA = A₂ − A₁** е мярка за скоростта на нарастване на цвета.',
            'До A₁ бързо реагиращите вече са реагирали, затова при **изваждането** приносът им почти изчезва. Бавно реагиращите внасят остатъчна грешка.',
          ]
        : [
            'Абсорбцията се отчита **веднъж** – по-късно (на схемата условно 5 min). Тя включва цвета от креатинина **и** от всички псевдохромогени, образувани дотогава.',
            'Затова при крайна точка влиянието на кетони, протеини и глюкоза е **по-голямо** – методът е по-чувствителен към тези вещества.',
          ],
  },
  {
    label: () => 'Светлина',
    title: () => 'Светлинен лъч през кюветата',
    body: () => [
      'Лъч във видимата област (на схемата ≈ 510 nm) преминава през кюветата; червено-оранжевият комплекс поглъща част от него. Цветът на лъча на схемата е условен.',
      'Дължината на вълната е **определена от реактива и анализатора** (най-често около 490–520 nm).',
    ],
  },
  {
    label: () => 'Измерване',
    title: (m) => (m === 'kin' ? 'Измерване – A₁, A₂ и ΔA' : 'Измерване – единична абсорбция'),
    body: (m) =>
      m === 'kin'
        ? [
            'Измерват се **A₁** и **A₂**; **ΔA = A₂ − A₁**. Според закона на Beer-Lambert **A = ε · l · c** – ΔA е пропорционална на концентрацията на комплекса.',
            'Собствената абсорбция на реагента (жълтият цвят) присъства и в двете отчитания и се **съкращава** при изваждането.',
          ]
        : [
            'Измерва се абсорбцията **A** при крайната точка. От нея се изважда **реагентният бланк** (собствената абсорбция на реагента).',
            'Според закона на Beer-Lambert **A = ε · l · c** – нетната абсорбция е пропорционална на концентрацията на комплекса (и на всички оцветени примеси).',
          ],
  },
  {
    label: () => 'Резултат',
    title: () => 'Изчисляване на концентрацията',
    body: (m) => [
      m === 'kin'
        ? 'ΔA на пробата се сравнява с ΔA на **стандарта**: **c = [(A₂ − A₁) проба / (A₂ − A₁) стандарт] × c стандарт**'
        : 'Нетната абсорбция на пробата се сравнява с тази на **стандарта**: **c = (A проба − A бланк) / (A стандарт − A бланк) × c стандарт**',
      'Резултатът е в µmol/L (1 mg/dL = 88,4 µmol/L). При компенсиран метод от него се изважда фиксирана стойност. Референтни граници и клинична интерпретация са извън обхвата на тази илюстрация.',
    ],
  },
];

/* ───────── Форми на частиците ───────── */
function CreaShape() {
  return <circle r={4.8} fill="var(--v-mg)" stroke="var(--v-ink)" strokeOpacity={0.3} strokeWidth={0.8} />;
}
function PicrateShape() {
  return <rect x={-4.5} y={-4.5} width={9} height={9} rx={1.8} fill="var(--v-pic)" stroke="var(--v-ink)" strokeOpacity={0.35} strokeWidth={0.8} />;
}
function OHShape() {
  return <circle r={2.9} fill="var(--v-dye-free)" opacity={0.9} />;
}
function ComplexShape() {
  return (
    <g>
      <rect x={-6.5} y={-6.5} width={13} height={13} rx={2.2} fill="var(--v-jaffe)" stroke="var(--v-ink)" strokeOpacity={0.35} strokeWidth={0.8} />
      <circle cx={5.5} cy={-5.5} r={3.6} fill="var(--v-mg)" stroke="var(--v-ink)" strokeOpacity={0.3} strokeWidth={0.7} />
    </g>
  );
}
function KetoneShape() {
  return <polygon points="0,-5.5 5.5,4 -5.5,4" fill="var(--v-blood)" stroke="var(--v-ink)" strokeOpacity={0.3} strokeWidth={0.7} />;
}

/* ───────── Геометрия на сцената ───────── */
const N_C = 8;
const N_PI = 14;
const N_OH = 10;
const N_F = 4;
const N_PR = 4;
const CUV = { x: 262, y: 70, w: 126, h: 214, top: 104 };
const rng = mulberry32(31);
const rnd = (x0: number, x1: number, y0: number, y1: number): [number, number] => [x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0)];
const C_POS: [number, number][] = Array.from({ length: N_C }, (_, i) => [298 + (i % 3) * 33 + (rng() - 0.5) * 8, 164 + Math.floor(i / 3) * 31 + (rng() - 0.5) * 8]);
const PI_POS: [number, number][] = Array.from({ length: N_PI }, () => rnd(280, 368, 134, 266));
const OH_POS: [number, number][] = Array.from({ length: N_OH }, () => rnd(278, 372, 130, 268));
const F_POS: [number, number][] = [
  [300, 140],
  [352, 148],
  [306, 262],
  [356, 256],
];
const PR_POS: [number, number][] = Array.from({ length: N_PR }, () => rnd(282, 366, 168, 264));

const countC = (c: number) => clamp(Math.round(c / 45), 1, N_C);

// индекси в масива на анимираните стойности
const G = { pic: 0, oh: 1, ovY: 2, ovR: 3, pr: 4, halo: 5, cFree: 6, cCplx: 6 + N_C, fast: 6 + 2 * N_C };

function targets(stage: number, nC: number, f: number, nF: number, S: number): number[] {
  const t: number[] = [];
  t[G.pic] = stage >= 1 ? (stage >= 3 ? 0.65 : 0.95) : 0;
  t[G.oh] = stage >= 1 ? 0.85 : 0;
  t[G.ovY] = stage >= 1 ? 0.22 : 0;
  t[G.ovR] = stage >= 3 ? 0.06 + 0.55 * f : 0;
  t[G.pr] = 0.75;
  t[G.halo] = stage >= 3 ? S * 0.9 : 0;
  for (let i = 0; i < N_C; i++) {
    t[G.cFree + i] = i < nC ? (stage >= 3 ? 0.28 : 1) : 0;
    t[G.cCplx + i] = i < nC && stage >= 3 ? 1 : 0;
  }
  for (let i = 0; i < N_F; i++) t[G.fast + i] = i < nF ? (stage >= 3 ? 0.2 : 1) : 0;
  return t;
}

const signed = (v: number, d = 0) => `${v > 0.5 * 10 ** -d ? '+' : ''}${fmt(v, d)}`;

export function CreatinineDiagram() {
  const uid = useId().replace(/:/g, '');
  const stepper = useStepper(STAGES.length);
  const [mode, setMode] = useState<Mode>('kin');
  const [conc, setConc] = useState(100);
  const [fast, setFast] = useState(0);
  const [slow, setSlow] = useState(0);
  const [comp, setComp] = useState(false);
  const stage = stepper.step;
  const s = STAGES[stage];

  const aMeas = mode === 'kin' ? aTot(conc, T2, fast, slow) : aTot(conc, T_END, fast, slow);
  const a1 = aTot(conc, T1, fast, slow);
  const dA = aMeas - a1;
  const r = reading(mode, conc, fast, slow);
  const raw = calcResult(mode, r);
  const cCalc = comp ? Math.max(0, raw - COMP) : raw;
  const T = 10 ** -aMeas;
  const beamOn = stage >= 5;
  const nC = countC(conc);
  const nF = Math.round(fast * N_F);
  const fCol = clamp((aMeas - BLANK) / 1.0, 0, 1);
  const cur = useTween(targets(stage, nC, fCol, nF, slow), 3.2);

  const timer = (() => {
    if (stage === 1) return '+ алкален пикрат';
    if (stage === 2) return 't = 0 s';
    if (stage === 3) return mode === 'kin' ? 't → 30 s' : 'цветът расте';
    if (stage === 4) return mode === 'kin' ? 't = 30 → 90 s' : `t = ${T_END / 60} min`;
    return '';
  })();

  return (
    <VizFrame
      title="Определяне на креатинин по метода на Jaffé"
      subtitle="Алкален пикрат стъпка по стъпка – кинетичен метод и крайна точка, псевдохромогени, стандарт и компенсация."
      icon="beaker"
      note="Схематична образователна илюстрация. Броят на частиците, цветовете, абсорбциите, времената, приносът на псевдохромогените и компенсацията са илюстративни и не представляват реални данни. Състав на реактива, времена и дължини на вълната се определят от производителя. Цветът на светлинния лъч е условен."
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-line" style={{ background: 'var(--v-panel)' }}>
          <svg
            viewBox="0 0 780 350"
            className="viz-svg block h-auto w-full"
            role="img"
            aria-label={`Схема на определянето на креатинин по метода на Jaffé, метод: ${mode === 'kin' ? 'кинетичен' : 'крайна точка'}, етап ${stage + 1}: ${s.title(mode)}`}
          >
            <Txt x={20} y={34} size={15} weight={800}>
              {stage + 1} · {s.label(mode)}
            </Txt>
            <Txt x={20} y={54} size={12} color="var(--v-soft)">
              {s.title(mode)}
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
              inside={
                <>
                  <rect x={CUV.x} y={CUV.top} width={CUV.w} height={CUV.h} fill="var(--v-pic)" opacity={cur[G.ovY]} />
                  <rect x={CUV.x} y={CUV.top} width={CUV.w} height={CUV.h} fill="var(--v-jaffe)" opacity={cur[G.ovR]} />
                </>
              }
            />

            {timer && (
              <Txt x={325} y={62} anchor="middle" size={11} color="var(--v-soft)" weight={700}>
                {timer}
              </Txt>
            )}

            {/* Протеини (бавно реагиращи) */}
            {PR_POS.map(([x, y], i) => (
              <Jig key={`p${i}`} x={x} y={y} opacity={cur[G.pr]} delay={i * 0.4}>
                <ellipse rx={8} ry={6} fill="var(--v-hb)" opacity={0.55} stroke="var(--v-ink)" strokeOpacity={0.25} />
                <ellipse rx={10.5} ry={8.5} fill="none" stroke="var(--v-jaffe)" strokeWidth={2.2} opacity={cur[G.halo]} />
              </Jig>
            ))}

            {/* Пикрат */}
            {PI_POS.map(([x, y], i) => (
              <Jig key={`pi${i}`} x={x} y={y} opacity={cur[G.pic]} delay={i * 0.19}>
                <PicrateShape />
              </Jig>
            ))}

            {/* OH⁻ */}
            {OH_POS.map(([x, y], i) => (
              <Jig key={`oh${i}`} x={x} y={y} opacity={cur[G.oh]} delay={i * 0.27}>
                <OHShape />
              </Jig>
            ))}

            {/* Кетони (бързо реагиращи) */}
            {F_POS.map(([x, y], i) => (
              <Jig key={`k${i}`} x={x} y={y} opacity={cur[G.fast + i]} delay={i * 0.33}>
                <KetoneShape />
              </Jig>
            ))}

            {/* Креатинин и комплекс */}
            {C_POS.map(([x, y], i) => (
              <Jig key={`c${i}`} x={x} y={y} opacity={1} delay={i * 0.23}>
                <g opacity={cur[G.cFree + i]}>
                  <CreaShape />
                </g>
                <g opacity={cur[G.cCplx + i]}>
                  <ComplexShape />
                </g>
              </Jig>
            ))}

            {/* Спектрофотометър */}
            <rect x={590} y={148} width={104} height={90} rx={9} fill="var(--v-detector)" />
            <rect x={586} y={180} width={9} height={24} rx={2} fill="var(--v-light)" opacity={stage >= 5 ? 0.3 + 0.7 * beamLevel(T) : 0.35} />
            <Txt x={642} y={165} anchor="middle" size={11} color="#ffffff" weight={600} mono opacity={stage >= 5 ? 1 : 0}>
              λ ≈ {LAMBDA} nm
            </Txt>
            {mode === 'kin' ? (
              <>
                <Txt x={642} y={183} anchor="middle" size={11} color="#ffffff" weight={600} mono opacity={stage >= 6 ? 1 : 0}>
                  A₁ = {fmt(a1, 3)}
                </Txt>
                <Txt x={642} y={201} anchor="middle" size={11} color="#ffffff" weight={600} mono opacity={stage >= 6 ? 1 : 0}>
                  A₂ = {fmt(aMeas, 3)}
                </Txt>
                <Txt x={642} y={221} anchor="middle" size={12} color="#ffffff" weight={700} mono opacity={stage >= 6 ? 1 : 0}>
                  ΔA = {fmt(dA, 3)}
                </Txt>
              </>
            ) : (
              <>
                <Txt x={642} y={187} anchor="middle" size={12} color="#ffffff" weight={700} mono opacity={stage >= 6 ? 1 : 0}>
                  A = {fmt(aMeas, 3)}
                </Txt>
                <Txt x={642} y={207} anchor="middle" size={11} color="#ffffff" weight={600} mono opacity={stage >= 6 ? 1 : 0}>
                  I/I₀ = {fmt(10 ** -aMeas * 100, 0)} %
                </Txt>
              </>
            )}
            <Txt x={642} y={258} anchor="middle" size={12} weight={600}>
              Спектрофотометър
            </Txt>

            <g opacity={stage === 7 ? 1 : 0} style={{ transition: 'opacity 0.5s' }}>
              <rect x={400} y={14} width={364} height={64} rx={10} fill="var(--surface)" stroke="var(--accent)" strokeWidth={1.8} />
              <Txt x={416} y={36} size={11} color="var(--v-soft)" weight={700}>
                {comp ? `РЕЗУЛТАТ (с компенсация − ${COMP} µmol/L)` : 'РЕЗУЛТАТ (изчислен спрямо стандарт)'}
              </Txt>
              <Txt x={416} y={62} size={16} weight={800} mono>
                Креатинин ≈ {fmt(cCalc, 0)} µmol/L ({fmt(cCalc / UMOL, 2)} mg/dL)
              </Txt>
            </g>

            {/* Легенда */}
            <g transform="translate(20 326)">
              <g transform="translate(6 0)">
                <CreaShape />
              </g>
              <Txt x={18} y={4} size={11} color="var(--v-soft)">
                креатинин
              </Txt>
              <g transform="translate(92 0)">
                <PicrateShape />
              </g>
              <Txt x={104} y={4} size={11} color="var(--v-soft)">
                пикрат
              </Txt>
              <g transform="translate(160 0)">
                <OHShape />
              </g>
              <Txt x={168} y={4} size={11} color="var(--v-soft)">
                OH⁻
              </Txt>
              <g transform="translate(216 0)">
                <ComplexShape />
              </g>
              <Txt x={230} y={4} size={11} color="var(--v-soft)">
                оцветен комплекс
              </Txt>
              <g transform="translate(350 0)">
                <KetoneShape />
              </g>
              <Txt x={362} y={4} size={11} color="var(--v-soft)">
                кетони (бързо реагиращи)
              </Txt>
              <ellipse cx={522} cy={0} rx={8} ry={6} fill="var(--v-hb)" opacity={0.7} />
              <Txt x={536} y={4} size={11} color="var(--v-soft)">
                протеин (бавно реагиращ)
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
            label="Начин на измерване"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'kin', label: 'Кинетичен метод', sub: 'ΔA = A₂ − A₁' },
              { value: 'end', label: 'Крайна точка', sub: 'едно отчитане' },
            ]}
          />
          <Slider
            id={`${uid}-c`}
            label="Условна концентрация на креатинин в пробата"
            value={conc}
            min={40}
            max={500}
            step={5}
            display={`${fmt(conc, 0)} µmol/L (${fmt(conc / UMOL, 2)} mg/dL)`}
            hint="Промени концентрацията – броят на креатининовите молекули, комплексът, цветът и абсорбцията се променят."
            onChange={setConc}
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {mode === 'kin' ? (
              <>
                <ValuePill label="Абсорбция A₁" value={fmt(a1, 3)} kind="measured" />
                <ValuePill label="Абсорбция A₂" value={fmt(aMeas, 3)} kind="measured" />
                <ValuePill label="ΔA = A₂ − A₁" value={fmt(dA, 3)} kind="calculated" />
              </>
            ) : (
              <>
                <ValuePill label="Абсорбция A" value={fmt(aMeas, 3)} kind="measured" />
                <ValuePill label="Нетна A (− бланк)" value={fmt(aMeas - BLANK, 3)} kind="calculated" />
                <ValuePill label="Пропусната светлина" value={fmt(10 ** -aMeas * 100, 0)} unit="%" kind="calculated" />
              </>
            )}
            <ValuePill label="Резултат спрямо стандарт" value={fmt(cCalc, 0)} unit="µmol/L" kind="calculated" />
          </div>
        </div>

        <div className="grid gap-4 2xl:grid-cols-2">
          <TimeCourse mode={mode} conc={conc} fast={fast} slow={slow} />
          <CalibrationPanel mode={mode} conc={conc} fast={fast} onFast={setFast} slow={slow} onSlow={setSlow} comp={comp} onComp={setComp} uid={uid} />
        </div>
      </div>
    </VizFrame>
  );
}

/* ───────── Развитие на цвета във времето ───────── */
function TimeCourse({ mode, conc, fast, slow }: { mode: Mode; conc: number; fast: number; slow: number }) {
  const W = 340;
  const H = 236;
  const L = 46;
  const R = 14;
  const Tp = 16;
  const B = 42;
  const tMax = 300;
  const peak = aTot(conc, tMax, fast, slow);
  const aMax = peak <= 0.6 ? 0.6 : peak <= 1.2 ? 1.2 : 2;
  const px = (t: number) => L + (t / tMax) * (W - L - R);
  const py = (a: number) => Tp + (1 - clamp(a, 0, aMax) / aMax) * (H - Tp - B);
  const path = (fn: (t: number) => number) => {
    let d = '';
    for (let t = 0; t <= tMax + 0.001; t += 3) d += `${d ? ' L' : 'M'}${px(t).toFixed(1)} ${py(fn(t)).toFixed(1)}`;
    return d;
  };
  const crea = (t: number) => BLANK + aCrea(conc, t);
  const total = (t: number) => aTot(conc, t, fast, slow);
  const hasInterf = fast > 0 || slow > 0;
  const marks = mode === 'kin' ? [T1, T2] : [T_END];

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="!m-0 text-sm font-bold text-ink">Развитие на цвета във времето</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg mx-auto mt-1 block h-auto w-full max-w-[440px]" role="img" aria-label="Нарастване на абсорбцията във времето: креатинин и псевдохромогени, с отбелязани моментите на отчитане">
        {[0, 0.25, 0.5, 0.75, 1].map((q) => (
          <g key={q}>
            <line x1={L} x2={W - R} y1={py(q * aMax)} y2={py(q * aMax)} stroke="var(--v-grid)" />
            <Txt x={L - 6} y={py(q * aMax) + 4} anchor="end" size={10} color="var(--v-soft)">
              {fmt(q * aMax, 2)}
            </Txt>
          </g>
        ))}
        {[0, 60, 120, 180, 240, 300].map((t) => (
          <Txt key={t} x={px(t)} y={H - B + 16} anchor="middle" size={10} color="var(--v-soft)">
            {t}
          </Txt>
        ))}
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--v-soft)" />
        <line x1={L} x2={L} y1={Tp} y2={H - B} stroke="var(--v-soft)" />

        {mode === 'kin' && <rect x={px(T1)} y={Tp} width={px(T2) - px(T1)} height={H - B - Tp} fill="var(--accent)" opacity={0.12} />}
        <line x1={L} x2={W - R} y1={py(BLANK)} y2={py(BLANK)} stroke="var(--v-soft)" strokeDasharray="2 3" />
        <Txt x={W - R - 4} y={py(BLANK) - 5} anchor="end" size={10} color="var(--v-soft)" weight={700} halo>
          бланк (реагент)
        </Txt>

        <path d={path(crea)} fill="none" stroke="var(--v-jaffe)" strokeWidth={2.8} />
        {hasInterf && <path d={path(total)} fill="none" stroke="var(--warn)" strokeWidth={2.2} strokeDasharray="5 4" />}

        {marks.map((t, i) => (
          <g key={t}>
            <line x1={px(t)} x2={px(t)} y1={py(total(t))} y2={H - B} stroke="var(--accent)" strokeDasharray="4 4" />
            <circle cx={px(t)} cy={py(total(t))} r={5.5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
            <Txt x={px(t) + (mode === 'kin' && i === 0 ? -8 : 8)} y={py(total(t)) - (mode === 'kin' ? 8 : 6)} anchor={mode === 'kin' && i === 0 ? 'end' : 'start'} size={10} color="var(--accent)" weight={700} halo>
              {mode === 'kin' ? (i === 0 ? 'A₁' : 'A₂') : 'A'}
            </Txt>
          </g>
        ))}

        <Txt x={(L + W - R) / 2} y={H - 8} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
          време от смесването, s (илюстративно)
        </Txt>
        <g transform={`rotate(-90 12 ${(Tp + H - B) / 2})`}>
          <Txt x={12} y={(Tp + H - B) / 2} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
            абсорбция A
          </Txt>
        </g>
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded" style={{ background: 'var(--v-jaffe)' }} /> само креатинин
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded border-t-2 border-dashed" style={{ borderColor: 'var(--warn)' }} /> с псевдохромогени
        </span>
        {mode === 'kin' && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: 'var(--accent)', opacity: 0.25 }} /> времеви прозорец
          </span>
        )}
      </div>
      <p className="!m-0 mt-2 text-xs text-muted">
        {mode === 'kin' ? (
          <>
            В прозореца <strong>A₁ → A₂</strong> цветът от креатинина нараства почти линейно, а <strong>бързо реагиращите</strong> вещества вече са образували цвят (той се съкращава при изваждането). Кривите са <strong>условен модел</strong>.
          </>
        ) : (
          <>
            При <strong>крайна точка</strong> се отчита една стойност; тя включва и цвета на всички псевдохромогени, образувани до този момент. Кривите са <strong>условен модел</strong>.
          </>
        )}
      </p>
    </div>
  );
}

/* ───────── Стандарт, псевдохромогени и компенсация ───────── */
function CalibrationPanel({
  mode,
  conc,
  fast,
  onFast,
  slow,
  onSlow,
  comp,
  onComp,
  uid,
}: {
  mode: Mode;
  conc: number;
  fast: number;
  onFast: (v: number) => void;
  slow: number;
  onSlow: (v: number) => void;
  comp: boolean;
  onComp: (v: boolean) => void;
  uid: string;
}) {
  const W = 340;
  const H = 236;
  const L = 50;
  const R = 14;
  const Tp = 16;
  const B = 42;
  const cMax = 600;
  const yMax = mode === 'kin' ? 0.5 : 2;
  const yTicks = mode === 'kin' ? [0, 0.1, 0.2, 0.3, 0.4, 0.5] : [0, 0.5, 1, 1.5, 2];
  const yDec = mode === 'kin' ? 1 : 1;
  const px = (c: number) => L + (c / cMax) * (W - L - R);
  const py = (v: number) => Tp + (1 - clamp(v, 0, yMax) / yMax) * (H - Tp - B);

  const kCal = readingCal(mode) / C_CAL;
  const rTrue = reading(mode, conc, 0, 0);
  const rMeas = reading(mode, conc, fast, slow);
  const raw = calcResult(mode, rMeas);
  const result = comp ? Math.max(0, raw - COMP) : raw;
  const err = result - conc;
  const xRead = rMeas / kCal;
  const xComp = Math.max(0, xRead - COMP);
  const showShift = Math.abs(rMeas - rTrue) > 0.0005;
  const rCal = readingCal(mode);

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="!m-0 text-sm font-bold text-ink">Стандарт, псевдохромогени и компенсация</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg mx-auto mt-1 block h-auto w-full max-w-[440px]" role="img" aria-label="Права през стандарта: отчетената величина спрямо концентрацията на креатинин с отбелязани истинска и измерена стойност при наличие на псевдохромогени">
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={py(v)} y2={py(v)} stroke="var(--v-grid)" />
            <Txt x={L - 6} y={py(v) + 4} anchor="end" size={10} color="var(--v-soft)">
              {fmt(v, yDec)}
            </Txt>
          </g>
        ))}
        {[0, 100, 200, 300, 400, 500, 600].map((c) => (
          <Txt key={c} x={px(c)} y={H - B + 16} anchor="middle" size={10} color="var(--v-soft)">
            {c}
          </Txt>
        ))}
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--v-soft)" />
        <line x1={L} x2={L} y1={Tp} y2={H - B} stroke="var(--v-soft)" />

        <line x1={px(0)} y1={py(0)} x2={px(cMax)} y2={py(kCal * cMax)} stroke="var(--v-jaffe)" strokeWidth={2.5} />
        <rect x={px(C_CAL) - 4.5} y={py(rCal) - 4.5} width={9} height={9} fill="var(--surface)" stroke="var(--v-jaffe)" strokeWidth={2} />
        <Txt x={px(C_CAL) + 8} y={py(rCal) + 16} size={10} color="var(--v-soft)" weight={600} halo>
          стандарт
        </Txt>

        {showShift && (
          <>
            <line x1={px(conc)} x2={px(conc)} y1={py(rTrue)} y2={py(rMeas)} stroke="var(--warn)" strokeWidth={2} strokeDasharray="3 3" />
            <line x1={px(conc)} x2={px(xRead)} y1={py(rMeas)} y2={py(rMeas)} stroke="var(--warn)" strokeDasharray="4 4" />
            <line x1={px(xRead)} x2={px(xRead)} y1={py(rMeas)} y2={H - B} stroke="var(--warn)" strokeDasharray="4 4" />
            <circle cx={px(conc)} cy={py(rMeas)} r={5.5} fill="var(--surface)" stroke="var(--warn)" strokeWidth={2.5} />
            <polygon points={`${px(xRead)},${H - B - 1} ${px(xRead) - 5},${H - B + 8} ${px(xRead) + 5},${H - B + 8}`} fill="var(--warn)" />
          </>
        )}
        {comp && (
          <polygon points={`${px(xComp)},${H - B - 1} ${px(xComp) - 5},${H - B + 8} ${px(xComp) + 5},${H - B + 8}`} fill="var(--surface)" stroke="var(--accent)" strokeWidth={2} />
        )}
        <line x1={px(conc)} x2={px(conc)} y1={py(rTrue)} y2={H - B} stroke="var(--accent)" strokeDasharray="4 4" />
        <circle cx={px(conc)} cy={py(rTrue)} r={6} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />

        <Txt x={(L + W - R) / 2} y={H - 8} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
          концентрация на креатинин, µmol/L (илюстративно)
        </Txt>
        <g transform={`rotate(-90 12 ${(Tp + H - B) / 2})`}>
          <Txt x={12} y={(Tp + H - B) / 2} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
            {mode === 'kin' ? 'ΔA = A₂ − A₁' : 'нетна абсорбция A'}
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
        {comp && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 border-2" style={{ borderColor: 'var(--accent)', transform: 'rotate(45deg)' }} /> след компенсация
          </span>
        )}
      </div>

      <div className="mt-3 space-y-3">
        <Slider
          id={`${uid}-s`}
          label="Бавно реагиращи (протеини, глюкоза, аскорбат)"
          value={slow}
          min={0}
          max={1}
          step={0.05}
          display={`${fmt(slow * 100, 0)} %`}
          hint="Условно ниво. Образуват цвят и в прозореца – завишават резултата."
          onChange={onSlow}
        />
        <Slider
          id={`${uid}-f`}
          label="Бързо реагиращи (кетони)"
          value={fast}
          min={0}
          max={1}
          step={0.05}
          display={`${fmt(fast * 100, 0)} %`}
          hint="Условно ниво. Реагират преди A₁ – при кинетичния метод почти не влияят, при крайна точка – силно."
          onChange={onFast}
        />
        <Toggle id={`${uid}-comp`} label={`Компенсация (изважда се ${COMP} µmol/L)`} checked={comp} onChange={onComp} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <ValuePill label="Истинска" value={fmt(conc, 0)} unit="µmol/L" kind="neutral" />
          <ValuePill label="Изчислен резултат" value={fmt(result, 0)} unit="µmol/L" kind="calculated" />
          <ValuePill label="Отклонение" value={signed(err)} unit="µmol/L" kind="calculated" />
        </div>
      </div>
      <p className="!m-0 mt-2 text-xs text-muted">
        Псевдохромогените <strong>завишават</strong> резултата; компенсацията изважда <strong>фиксирана</strong> стойност, която е вярна само за „средната“ проба. Без псевдохромогени тя ще <strong>занижи</strong> резултата, а при проба с повече от средното – няма да го коригира напълно. Стойностите са <strong>условни</strong>; конкретната корекция се определя от производителя.
      </p>
    </div>
  );
}
