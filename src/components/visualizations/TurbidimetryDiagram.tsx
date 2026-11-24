import { useId, useState } from 'react';
import { VizFrame, ExplainPanel, ValuePill } from '../ui/VizFrame';
import { StepControls, Slider } from '../ui/Controls';
import { RichText } from '../ui/RichText';
import { useStepper } from '../../hooks/useStepper';
import { useTween } from '../../hooks/useTween';
import { Antibody, Cuvette, Jig, Txt } from './shared';
import { fmt, mulberry32 } from '../../lib/stats';

/* ───────── Данни за етапите ───────── */
const STAGES: { label: string; title: string; body: string[] }[] = [
  {
    label: 'Кръв',
    title: 'Проба цяла кръв',
    body: [
      'Анализира се **цяла кръв**, взета с антикоагулант (обикновено EDTA – според листовката на реактива). В еритроцитите хемоглобинът (Hb) е „опакован“ вътре в клетките.',
      'Част от хемоглобина е **гликиран** – това е HbA1c. Той показва колко захар е свързана с хемоглобина през живота на еритроцитите.',
    ],
  },
  {
    label: 'Антиген',
    title: 'Хемолиза – освобождаване на HbA1c',
    body: [
      'Хемолизиращ реагент **разрушава еритроцитите** и освобождава хемоглобина в разтвора. Така гликираният хемоглобин (пурпурните частици) става достъпен за реактива.',
      'HbA1c е **антигенът**, който ще бъде определян; останалият (негликиран) Hb е розов.',
    ],
  },
  {
    label: 'Антитяло',
    title: 'Добавяне на антитела срещу HbA1c',
    body: [
      'Добавя се реагент с **антитела** (тюркоазени Y-образни частици), специфични за гликираната част на хемоглобина.',
      'Количеството антитела е **ограничено и известно** – това е ключово за инхибиционния принцип на метода.',
    ],
  },
  {
    label: 'Комплекси',
    title: 'Образуване на разтворими комплекси',
    body: [
      'Антителата се свързват с HbA1c. Една молекула HbA1c има **само едно** място за свързване, затова се образуват **разтворими комплекси** – те не създават мътност.',
      'Антителата, които не са намерили HbA1c, остават **свободни**. Колкото повече HbA1c има в пробата, толкова **по-малко свободни антитела** остават.',
    ],
  },
  {
    label: 'Мътност',
    title: 'Полихаптен и образуване на мътност',
    body: [
      'Добавя се **полихаптен** – молекула с много копия на същия епитоп (кехлибарените частици). Той свързва **свободните** антитела и ги омрежва в **неразтворими агрегати**.',
      'Агрегатите правят разтвора **мътен**. Връзката е **обратнопропорционална**: повече HbA1c → по-малко свободни антитела → по-ниска мътност.',
    ],
  },
  {
    label: 'Светлина',
    title: 'Светлина през кюветата',
    body: [
      'Светлинен лъч преминава през кюветата. Частиците на агрегатите **разсейват и поглъщат** част от светлината, затова през кюветата минава по-малко светлина.',
      'Дължината на вълната и конкретните условия са **определени от реактива и анализатора** – вж. листовката.',
    ],
  },
  {
    label: 'Детектор',
    title: 'Фотодетекторът измерва пропуснатата светлина',
    body: [
      'Детекторът измерва интензитета на пропусната светлина **I** и го сравнява с начален интензитет **I₀**. Сигналът се изразява като привидна абсорбция: **A = −log₁₀(I / I₀)**.',
      'Повече мътност → по-малко пропусната светлина → по-голяма A.',
    ],
  },
  {
    label: 'Резултат',
    title: 'От сигнал към резултат',
    body: [
      'Сигналът за мътност се превръща чрез **калибрационна крива** в концентрация на HbA1c. **Общият хемоглобин** в същата проба се определя фотометрично.',
      '**HbA1c % = HbA1c / общ Hb** – резултатът се дава като отношение и се докладва в **% (NGSP)** и/или **mmol/mol (IFCC)**.',
    ],
  },
];

/* ───────── Геометрия на сцената ───────── */
const N_AB = 10;
const N_A1C = 8;
const N_HB = 10;
const N_RBC = 6;
const N_HAP = 5;
const AB_OFF = 0;
const A1C_OFF = AB_OFF + N_AB * 3;
const HB_OFF = A1C_OFF + N_A1C * 3;
const RBC_OFF = HB_OFF + N_HB * 3;
const HAP_OFF = RBC_OFF + N_RBC * 3;
const EXTRA_OFF = HAP_OFF + N_HAP * 3; // [кръв, хемолизат, мътност] – прозрачности на течността

const CUV = { x: 262, y: 70, w: 126, h: 214, top: 104 };
const AB_HOME: [number, number][] = Array.from({ length: N_AB }, (_, i) => [282 + (i % 5) * 22, 128 + Math.floor(i / 5) * 24]);
const A1C_POS: [number, number][] = Array.from({ length: N_A1C }, (_, j) => (j < 4 ? [280 + j * 30, 232] : [295 + (j - 4) * 30, 262]));
const CLUSTER: [number, number][] = Array.from({ length: N_AB }, (_, f) => [292 + (f % 3) * 36 + (Math.floor(f / 3) % 2) * 14, 148 + Math.floor(f / 3) * 22]);
const HAP_POS: [number, number][] = [
  [310, 160],
  [346, 160],
  [318, 182],
  [354, 182],
  [334, 204],
];
const rng = mulberry32(11);
const HB_POS: [number, number][] = Array.from({ length: N_HB }, () => [274 + rng() * 104, 126 + rng() * 134]);
const RBC_POS: [number, number][] = [
  [292, 210],
  [334, 224],
  [364, 190],
  [304, 252],
  [346, 258],
  [372, 236],
];

const A_MAX = 0.8; // привидна абсорбция при пълна мътност (илюстративно)

function targets(stage: number, nBound: number, turb: number): number[] {
  const t: number[] = [];
  for (let i = 0; i < N_AB; i++) {
    let [x, y] = AB_HOME[i];
    if (i < nBound && stage >= 3) {
      x = A1C_POS[i][0];
      y = A1C_POS[i][1] - 13;
    } else if (i >= nBound && stage >= 4) {
      [x, y] = CLUSTER[i - nBound];
    }
    t.push(x, y, stage >= 2 ? 1 : 0);
  }
  for (let j = 0; j < N_A1C; j++) t.push(A1C_POS[j][0], A1C_POS[j][1], stage >= 1 && j < nBound ? 1 : 0);
  for (let h = 0; h < N_HB; h++) t.push(HB_POS[h][0], HB_POS[h][1], stage >= 1 ? 1 : 0);
  for (let r = 0; r < N_RBC; r++) t.push(RBC_POS[r][0], RBC_POS[r][1], stage === 0 ? 1 : 0);
  for (let k = 0; k < N_HAP; k++) t.push(HAP_POS[k][0], HAP_POS[k][1], stage >= 4 ? 1 : 0);
  t.push(stage === 0 ? 0.45 : 0, stage >= 1 ? 0.3 : 0, stage >= 4 ? turb * 0.55 : 0);
  return t;
}

/** Връзка между HbA1c (NGSP %) и броя свързани антитела (непрекъснато, схематично). */
const boundFromHbA1c = (v: number) => 1 + ((v - 4) / 8) * 7;

export function TurbidimetryDiagram() {
  const uid = useId().replace(/:/g, '');
  const stepper = useStepper(STAGES.length);
  const [hba1c, setHba1c] = useState(7);
  const stage = stepper.step;

  const bound = boundFromHbA1c(hba1c);
  const nBound = Math.round(bound);
  const freeFrac = (N_AB - bound) / N_AB; // относителна мътност (илюстративно)
  const turb = Math.max(0, Math.min(1, freeFrac));
  const A = A_MAX * turb;
  const T = 10 ** -A;
  const ifcc = (hba1c - 2.152) / 0.09148;

  const cur = useTween(targets(stage, nBound, turb), 3.2);
  const beamOn = stage >= 5;
  const turbShown = stage >= 4;
  const Tshown = turbShown ? T : 1;

  // Връзки полихаптен – свободни антитела
  const links: { x1: number; y1: number; x2: number; y2: number; o: number }[] = [];
  for (let k = 0; k < N_HAP; k++) {
    for (const f of [k, k + 2]) {
      const i = nBound + f;
      if (i < N_AB) links.push({ x1: cur[HAP_OFF + k * 3], y1: cur[HAP_OFF + k * 3 + 1], x2: cur[AB_OFF + i * 3], y2: cur[AB_OFF + i * 3 + 1] + 5, o: cur[HAP_OFF + k * 3 + 2] * 0.8 });
    }
  }

  const s = STAGES[stage];

  return (
    <VizFrame
      title="Имунотурбидиметричен анализ на HbA1c – стъпка по стъпка"
      subtitle="Осем етапа от кръвната проба до резултата. Използвай бутоните или кликни на номер на етап."
      icon="droplet"
      note="Схематична образователна илюстрация (инхибиционен имунотурбидиметричен принцип, TINIA). Броят на частиците, мътността и пропусканата светлина са илюстративни и не представляват реални измервания. Конкретните реактиви и параметри зависят от производителя."
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-line" style={{ background: 'var(--v-panel)' }}>
          <svg viewBox="0 0 780 340" className="viz-svg block h-auto w-full" role="img" aria-label={`Схема на имунотурбидиметричен анализ, етап ${stage + 1}: ${s.title}`}>
            <defs>
              <linearGradient id={`${uid}-beam`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="var(--v-light)" stopOpacity="0.6" />
                <stop offset="1" stopColor="var(--v-light)" stopOpacity={0.6 * Tshown} />
              </linearGradient>
            </defs>

            <Txt x={20} y={34} size={15} weight={800}>
              {stage + 1} · {s.label}
            </Txt>
            <Txt x={20} y={54} size={12} color="var(--v-soft)">
              {s.title}
            </Txt>

            {/* Лъч */}
            <g opacity={beamOn ? 1 : 0.0}>
              <rect x={64} y={180} width={198} height={20} fill="var(--v-light)" opacity={0.55} />
              <rect x={CUV.x} y={180} width={CUV.w} height={20} fill={`url(#${uid}-beam)`} />
              <rect x={CUV.x + CUV.w} y={180} width={590 - (CUV.x + CUV.w)} height={20} fill="var(--v-light)" opacity={0.6 * Tshown} />
              <line x1={64} y1={190} x2={590} y2={190} stroke="var(--v-light)" strokeWidth={2} className="beam" opacity={0.9} />
            </g>

            {/* Лампа */}
            <rect x={24} y={168} width={40} height={44} rx={7} fill="var(--v-metal)" />
            <circle cx={64} cy={190} r={7} fill="var(--v-light)" opacity={beamOn ? 1 : 0.35} />
            <Txt x={44} y={230} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
              Светлинен
            </Txt>
            <Txt x={44} y={244} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
              източник
            </Txt>

            {/* Кювета и течност */}
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
                  <rect x={CUV.x} y={CUV.top} width={CUV.w} height={CUV.h} fill="var(--v-blood)" opacity={cur[EXTRA_OFF]} />
                  <rect x={CUV.x} y={CUV.top} width={CUV.w} height={CUV.h} fill="var(--v-hb)" opacity={cur[EXTRA_OFF + 1]} />
                  <rect x={CUV.x} y={CUV.top} width={CUV.w} height={CUV.h} fill="#8d99ab" opacity={cur[EXTRA_OFF + 2]} />
                </>
              }
            />

            {/* Свързващи линии (омрежване) */}
            {links.map((l, i) => (
              <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="var(--v-hapten)" strokeWidth={1.6} opacity={l.o} />
            ))}

            {/* Еритроцити */}
            {Array.from({ length: N_RBC }, (_, r) => (
              <Jig key={`r${r}`} x={cur[RBC_OFF + r * 3]} y={cur[RBC_OFF + r * 3 + 1]} opacity={cur[RBC_OFF + r * 3 + 2]} delay={r * 0.37}>
                <circle r={9} fill="var(--v-blood)" stroke="var(--v-ink)" strokeOpacity={0.35} strokeWidth={1} />
                <ellipse rx={4.5} ry={2.6} fill="var(--v-ink)" opacity={0.18} />
              </Jig>
            ))}

            {/* Хемоглобин */}
            {Array.from({ length: N_HB }, (_, h) => (
              <Jig key={`h${h}`} x={cur[HB_OFF + h * 3]} y={cur[HB_OFF + h * 3 + 1]} opacity={cur[HB_OFF + h * 3 + 2]} delay={h * 0.23}>
                <circle r={5} fill="var(--v-hb)" stroke="var(--v-ink)" strokeOpacity={0.3} strokeWidth={0.8} />
              </Jig>
            ))}

            {/* HbA1c */}
            {Array.from({ length: N_A1C }, (_, j) => (
              <Jig key={`a${j}`} x={cur[A1C_OFF + j * 3]} y={cur[A1C_OFF + j * 3 + 1]} opacity={cur[A1C_OFF + j * 3 + 2]} delay={j * 0.31}>
                <circle r={6.5} fill="var(--v-hba1c)" stroke="var(--v-ink)" strokeOpacity={0.3} strokeWidth={0.8} />
                <rect x={3} y={-10} width={5.5} height={5.5} rx={1} fill="var(--v-hapten)" />
              </Jig>
            ))}

            {/* Антитела */}
            {Array.from({ length: N_AB }, (_, i) => (
              <Jig key={`b${i}`} x={cur[AB_OFF + i * 3]} y={cur[AB_OFF + i * 3 + 1]} opacity={cur[AB_OFF + i * 3 + 2]} delay={i * 0.19}>
                <Antibody />
              </Jig>
            ))}

            {/* Полихаптен */}
            {Array.from({ length: N_HAP }, (_, k) => (
              <Jig key={`p${k}`} x={cur[HAP_OFF + k * 3]} y={cur[HAP_OFF + k * 3 + 1]} opacity={cur[HAP_OFF + k * 3 + 2]} delay={k * 0.29}>
                <rect x={-5} y={-5} width={10} height={10} rx={2} fill="var(--v-hapten)" transform="rotate(45)" />
              </Jig>
            ))}

            {/* Фотодетектор */}
            <rect x={590} y={148} width={104} height={84} rx={9} fill="var(--v-detector)" />
            <rect x={586} y={178} width={9} height={24} rx={2} fill="var(--v-light)" opacity={stage >= 5 ? 0.9 : 0.35} />
            <rect x={606} y={166} width={72} height={12} rx={3} fill="#ffffff" opacity={0.18} />
            <rect x={606} y={166} width={72 * Tshown} height={12} rx={3} fill="var(--v-light)" opacity={stage >= 6 ? 1 : 0} />
            <Txt x={642} y={204} anchor="middle" size={12} color="#ffffff" weight={700} mono opacity={stage >= 6 ? 1 : 0}>
              I/I₀ = {fmt(Tshown * 100, 0)} %
            </Txt>
            <Txt x={642} y={222} anchor="middle" size={11} color="#ffffff" weight={600} mono opacity={stage >= 6 ? 1 : 0}>
              A = {fmt(turbShown ? A : 0, 2)}
            </Txt>
            <Txt x={642} y={252} anchor="middle" size={12} weight={600}>
              Фотодетектор
            </Txt>

            {/* Резултат */}
            <g opacity={stage === 7 ? 1 : 0} style={{ transition: 'opacity 0.5s' }}>
              <rect x={440} y={14} width={324} height={64} rx={10} fill="var(--surface)" stroke="var(--accent)" strokeWidth={1.8} />
              <Txt x={456} y={36} size={11} color="var(--v-soft)" weight={700}>
                РЕЗУЛТАТ (изчислен от сигнала и общия Hb)
              </Txt>
              <Txt x={456} y={62} size={20} weight={800} mono>
                {fmt(hba1c, 1)} % NGSP · {fmt(ifcc, 0)} mmol/mol
              </Txt>
            </g>

            {/* Легенда */}
            <g transform="translate(20 312)">
              <circle cx={6} cy={0} r={5} fill="var(--v-hb)" />
              <Txt x={16} y={4} size={11} color="var(--v-soft)">
                Hb
              </Txt>
              <circle cx={50} cy={0} r={5.5} fill="var(--v-hba1c)" />
              <Txt x={61} y={4} size={11} color="var(--v-soft)">
                HbA1c (гликиран Hb)
              </Txt>
              <g transform="translate(212 0)">
                <Antibody scale={0.8} />
              </g>
              <Txt x={224} y={4} size={11} color="var(--v-soft)">
                антитяло
              </Txt>
              <rect x={296} y={-4} width={8} height={8} rx={1.5} fill="var(--v-hapten)" transform="rotate(45 300 0)" />
              <Txt x={314} y={4} size={11} color="var(--v-soft)">
                полихаптен
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

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)]">
          <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
            <Slider
              id={`${uid}-hba1c`}
              label="Условно ниво на HbA1c в пробата (NGSP)"
              value={hba1c}
              min={4}
              max={12}
              step={0.1}
              display={`${fmt(hba1c, 1)} %`}
              hint="Плъзни, за да видиш как повече HbA1c означава по-малко свободни антитела и по-малка мътност."
              onChange={setHba1c}
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ValuePill label="Свързани антитела" value={`${fmt(bound, 1)} / ${N_AB}`} kind="neutral" />
              <ValuePill label="Свободни антитела" value={`${fmt(N_AB - bound, 1)} / ${N_AB}`} kind="neutral" />
              <ValuePill label="Относителна мътност" value={turbShown ? fmt(turb * 100, 0) : '0'} unit="%" kind="calculated" />
              <ValuePill label="Привидна A" value={fmt(turbShown ? A : 0, 2)} kind="calculated" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ValuePill label="HbA1c (NGSP)" value={fmt(hba1c, 1)} unit="%" kind="calculated" />
              <ValuePill label="HbA1c (IFCC)" value={fmt(ifcc, 0)} unit="mmol/mol" kind="calculated" />
            </div>
            <p className="!m-0 text-xs leading-relaxed text-muted">
              IFCC = (NGSP − 2,152) / 0,09148 – формула за преобразуване между двете скали на докладване. Стойностите на мътността и A са илюстративни.
            </p>
          </div>
          <RelationChart hba1c={hba1c} turb={turb} />
        </div>
      </div>
    </VizFrame>
  );
}

/** Обратна зависимост между HbA1c и мътността (схематично). */
function RelationChart({ hba1c, turb }: { hba1c: number; turb: number }) {
  const W = 300;
  const H = 210;
  const L = 44;
  const R = 12;
  const Tp = 14;
  const B = 38;
  const px = (v: number) => L + ((v - 4) / 8) * (W - L - R);
  const py = (v: number) => Tp + (1 - v) * (H - Tp - B);
  const f = (v: number) => (N_AB - boundFromHbA1c(v)) / N_AB;
  const pts = [4, 6, 8, 10, 12].map((v) => `${px(v)},${py(f(v))}`).join(' ');
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="!m-0 mb-1 text-sm font-bold text-ink">Обратна зависимост</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg mx-auto block h-auto w-full max-w-[480px]" role="img" aria-label="Графика: колкото по-високо е HbA1c, толкова по-ниска е мътността">
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={py(v)} y2={py(v)} stroke="var(--v-grid)" />
            <Txt x={L - 6} y={py(v) + 4} anchor="end" size={10} color="var(--v-soft)">
              {fmt(v, 1)}
            </Txt>
          </g>
        ))}
        {[4, 6, 8, 10, 12].map((v) => (
          <Txt key={v} x={px(v)} y={H - B + 16} anchor="middle" size={10} color="var(--v-soft)">
            {v}
          </Txt>
        ))}
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--v-soft)" />
        <line x1={L} x2={L} y1={Tp} y2={H - B} stroke="var(--v-soft)" />
        <polyline points={pts} fill="none" stroke="var(--v-antibody)" strokeWidth={2.5} />
        <line x1={px(hba1c)} x2={px(hba1c)} y1={py(turb)} y2={H - B} stroke="var(--v-hba1c)" strokeDasharray="4 4" />
        <line x1={L} x2={px(hba1c)} y1={py(turb)} y2={py(turb)} stroke="var(--v-hba1c)" strokeDasharray="4 4" />
        <circle cx={px(hba1c)} cy={py(turb)} r={6} fill="var(--v-hba1c)" stroke="var(--surface)" strokeWidth={2} />
        <Txt x={(L + W - R) / 2} y={H - 6} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
          HbA1c, % (NGSP)
        </Txt>
        <g transform={`rotate(-90 12 ${(Tp + H - B) / 2})`}>
          <Txt x={12} y={(Tp + H - B) / 2} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
            относителна мътност
          </Txt>
        </g>
      </svg>
      <p className="!m-0 mt-1 text-xs text-muted">Схематична зависимост – не е калибрационна крива на реален реактив.</p>
    </div>
  );
}
