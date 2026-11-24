import { useId, useState } from 'react';
import { VizFrame, ExplainPanel, ValuePill } from '../ui/VizFrame';
import { Segmented, Slider } from '../ui/Controls';
import { RichText } from '../ui/RichText';
import { useTween } from '../../hooks/useTween';
import { Jig, Txt } from './shared';
import { fmt, mulberry32 } from '../../lib/stats';

const S_THEORY = 61.5; // mV/декада при 37 °C

type IonId = 'na' | 'k' | 'cl';

interface IonInfo {
  id: IonId;
  sym: string;
  name: string;
  sign: 1 | -1;
  color: string;
  min: number;
  max: number;
  step: number;
  def: number;
  mid: number;
  plot: [number, number];
  calLow: number;
  calHigh: number;
  decimals: number;
  membrane: string;
  glass: boolean;
  title: string;
  body: string[];
}

const IONS: Record<IonId, IonInfo> = {
  na: {
    id: 'na',
    sym: 'Na⁺',
    name: 'Натрий',
    sign: 1,
    color: 'var(--v-na)',
    min: 100,
    max: 180,
    step: 1,
    def: 140,
    mid: 140,
    plot: [10, 1000],
    calLow: 100,
    calHigh: 160,
    decimals: 0,
    membrane: 'стъклена мембрана',
    glass: true,
    title: 'Натриев електрод – стъклена мембрана',
    body: [
      'Мембраната е **стъкло със специален състав**, чувствително към Na⁺. В тънкия хидратиран слой на повърхността Na⁺ от пробата **се обменя** с Na⁺ от стъклената матрица; другите катиони почти не се обменят.',
      'Обменът създава **разлика в зарядите** между двете страни на мембраната – измерва се като потенциал спрямо референтния електрод.',
    ],
  },
  k: {
    id: 'k',
    sym: 'K⁺',
    name: 'Калий',
    sign: 1,
    color: 'var(--v-k)',
    min: 1.5,
    max: 8,
    step: 0.1,
    def: 4,
    mid: 4,
    plot: [1, 100],
    calLow: 2,
    calHigh: 6,
    decimals: 1,
    membrane: 'PVC мембрана с валиномицин',
    glass: false,
    title: 'Калиев електрод – мембрана с валиномицин',
    body: [
      'Полимерната (PVC) мембрана съдържа **валиномицин** – йонофор с „кухина“, която пасва на K⁺. Той **обратимо свързва K⁺** значително по-добре от Na⁺ и го пренася през мембраната.',
      'Така на границата проба/мембрана се натрупва положителен заряд, зависещ от **активността на K⁺**.',
    ],
  },
  cl: {
    id: 'cl',
    sym: 'Cl⁻',
    name: 'Хлорид',
    sign: -1,
    color: 'var(--v-cl)',
    min: 70,
    max: 130,
    step: 1,
    def: 100,
    mid: 100,
    plot: [10, 1000],
    calLow: 80,
    calHigh: 120,
    decimals: 0,
    membrane: 'анионобменна мембрана',
    glass: false,
    title: 'Хлориден електрод – анионобменна мембрана',
    body: [
      'Мембраната съдържа **анионобменен материал**, който избирателно взаимодейства с Cl⁻. Типично е полимерна мембрана; съставът зависи от производителя.',
      'Тъй като Cl⁻ е **анион**, на страната към пробата се натрупва **отрицателен** заряд и **знакът на потенциала е обратен** спрямо Na⁺ и K⁺.',
    ],
  },
};

/** Относителен потенциал спрямо средната (референтна) концентрация, mV. */
const eRel = (ion: IonInfo, c: number, slope: number) => ion.sign * slope * Math.log10(c / ion.mid);

/* ───────── Геометрия на сцената ───────── */
const N_T = 16; // целеви йони
const N_O = 10; // други йони
const rng = mulberry32(21);
const T_POS: [number, number][] = Array.from({ length: N_T }, () => [86 + rng() * 190, 124 + rng() * 112]);
const O_POS: [number, number][] = Array.from({ length: N_O }, () => [86 + rng() * 190, 124 + rng() * 112]);
const I_POS: [number, number][] = [
  [348, 140],
  [380, 168],
  [420, 138],
  [352, 214],
  [396, 226],
  [440, 196],
  [500, 150],
  [492, 222],
];

function ionTargets(n: number): number[] {
  const t: number[] = [];
  for (let i = 0; i < N_T; i++) t.push(T_POS[i][0], T_POS[i][1], i < n ? 1 : 0);
  return t;
}

export function ISEDiagram() {
  const uid = useId().replace(/:/g, '');
  const [ionId, setIonId] = useState<IonId>('na');
  const ion = IONS[ionId];
  const [conc, setConc] = useState<Record<IonId, number>>({ na: 140, k: 4, cl: 100 });
  const [realSlope, setRealSlope] = useState(57);
  const c = conc[ionId];

  const frac = (Math.log10(c) - Math.log10(ion.min)) / (Math.log10(ion.max) - Math.log10(ion.min));
  const nTarget = Math.round(5 + frac * 11);
  const nCharge = Math.round(2 + frac * 6);
  const cur = useTween(ionTargets(nTarget), 3);

  const E = eRel(ion, c, S_THEORY);
  const ePlus = ion.sign === 1;

  return (
    <VizFrame
      title="Йонселективен електрод – как възниква потенциалът"
      subtitle="Избери електрод (Na⁺, K⁺ или Cl⁻), промени концентрацията и наблюдавай мембраната, потенциала и калибрацията."
      icon="zap"
      note="Схематична образователна илюстрация. Броят на йоните и стойностите на потенциала са илюстративни; електродът реагира на активност, а не на брой частици. Реалните мембрани и анализатори могат да се различават по състав и конструкция."
    >
      <div className="space-y-4">
        <Segmented<IonId>
          label="Избор на електрод"
          value={ionId}
          onChange={setIonId}
          options={[
            { value: 'na', label: 'Na⁺ електрод', sub: 'стъклена мембрана' },
            { value: 'k', label: 'K⁺ електрод', sub: 'валиномицин' },
            { value: 'cl', label: 'Cl⁻ електрод', sub: 'анионобменна мембрана' },
          ]}
        />

        <div className="overflow-hidden rounded-xl border border-line" style={{ background: 'var(--v-panel)' }}>
          <svg viewBox="0 0 780 320" className="viz-svg block h-auto w-full" role="img" aria-label={`Схема на ${ion.name.toLowerCase()}ов йонселективен електрод с ${ion.membrane}`}>
            <defs>
              <clipPath id={`${uid}-s`}>
                <rect x={70} y={110} width={230} height={150} rx={6} />
              </clipPath>
            </defs>

            {/* Проводници към волтметъра */}
            <g stroke="var(--v-ink)" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="125,150 125,26 275,26" />
              <polyline points="470,180 470,26 319,26" />
            </g>
            <circle cx={297} cy={26} r={22} fill="var(--surface)" stroke="var(--v-ink)" strokeWidth={2} />
            <Txt x={297} y={31} anchor="middle" size={13} weight={800}>
              mV
            </Txt>
            <Txt x={297} y={68} anchor="middle" size={14} weight={800} mono color="var(--accent)">
              ΔE = {E >= 0 ? '+' : ''}
              {fmt(E, 1)} mV
            </Txt>
            <Txt x={297} y={82} anchor="middle" size={10} color="var(--v-soft)">
              измерено спрямо референтния електрод
            </Txt>

            {/* Проба: входна тръба */}
            <rect x={14} y={168} width={58} height={26} fill="var(--v-liquid)" stroke="var(--v-glass)" strokeWidth={2} />
            <line x1={24} y1={181} x2={66} y2={181} stroke="var(--accent)" strokeWidth={2.5} className="flow-line" />
            <Txt x={14} y={212} size={11} color="var(--v-soft)" weight={600}>
              проба
            </Txt>

            {/* Камера на пробата */}
            <rect x={70} y={110} width={230} height={150} rx={6} fill="var(--v-liquid)" />
            <rect x={70} y={110} width={230} height={150} rx={6} fill="none" stroke="var(--v-glass)" strokeWidth={2.5} />
            {/* Вътрешна камера */}
            <rect x={322} y={110} width={200} height={150} rx={6} fill={ion.color} opacity={0.12} />
            <rect x={322} y={110} width={200} height={150} rx={6} fill="none" stroke="var(--v-glass)" strokeWidth={2.5} />

            {/* Референтен електрод */}
            <rect x={118} y={96} width={14} height={90} rx={3} fill="var(--v-metal)" stroke="var(--v-ink)" strokeOpacity={0.4} />
            <Txt x={138} y={104} size={10} color="var(--v-soft)" weight={600}>
              референтен електрод
            </Txt>

            {/* Вътрешен електрод */}
            <rect x={463} y={96} width={14} height={108} rx={3} fill="var(--v-metal)" stroke="var(--v-ink)" strokeOpacity={0.4} />
            <rect x={463} y={176} width={14} height={28} rx={3} fill="var(--v-ink)" opacity={0.35} />
            <Txt x={484} y={104} size={10} color="var(--v-soft)" weight={600}>
              вътрешен Ag/AgCl електрод
            </Txt>

            {/* Мембрана */}
            <rect x={300} y={102} width={22} height={166} rx={4} fill={ion.glass ? 'var(--v-glass)' : 'var(--v-metal)'} opacity={ion.glass ? 0.85 : 0.8} stroke="var(--v-ink)" strokeOpacity={0.45} />
            {!ion.glass && (
              <g stroke="var(--v-ink)" strokeOpacity={0.45} strokeWidth={1.2} fill="none">
                {[122, 150, 178, 206, 234].map((y) => (
                  <path key={y} d={`M304 ${y} q7 -9 14 0`} />
                ))}
              </g>
            )}
            <Txt x={311} y={290} anchor="middle" size={11} weight={700}>
              мембрана
            </Txt>
            <Txt x={311} y={304} anchor="middle" size={10} color="var(--v-soft)">
              ({ion.membrane})
            </Txt>
            <Txt x={185} y={290} anchor="middle" size={11} weight={700}>
              проба
            </Txt>
            <Txt x={440} y={290} anchor="middle" size={11} weight={700}>
              вътрешен електролит
            </Txt>
            <Txt x={440} y={304} anchor="middle" size={10} color="var(--v-soft)">
              (постоянен състав)
            </Txt>

            {/* Заряди на границите */}
            {Array.from({ length: nCharge }, (_, i) => {
              const y = 120 + (i + 0.5) * (130 / Math.max(nCharge, 1));
              return (
                <g key={i}>
                  <circle cx={292} cy={y} r={6} fill={ePlus ? 'var(--bad)' : 'var(--info)'} opacity={0.9} />
                  <Txt x={292} y={y + 3.5} anchor="middle" size={10} weight={800} color="#ffffff">
                    {ePlus ? '+' : '−'}
                  </Txt>
                  <circle cx={330} cy={y} r={6} fill={ePlus ? 'var(--info)' : 'var(--bad)'} opacity={0.9} />
                  <Txt x={330} y={y + 3.5} anchor="middle" size={10} weight={800} color="#ffffff">
                    {ePlus ? '−' : '+'}
                  </Txt>
                </g>
              );
            })}

            {/* Стрелки към мембраната: целевият йон се свързва, другите не */}
            <g>
              {[150, 190, 230].map((y) => (
                <line key={y} x1={250} y1={y} x2={284} y2={y} stroke={ion.color} strokeWidth={2.2} className="flow-line" opacity={0.85} />
              ))}
            </g>

            {/* Йони в пробата */}
            <g clipPath={`url(#${uid}-s)`}>
              {O_POS.map((p, i) => (
                <Jig key={`o${i}`} x={p[0]} y={p[1]} delay={i * 0.31}>
                  <circle r={4.5} fill="var(--v-soft)" opacity={0.8} />
                </Jig>
              ))}
              {Array.from({ length: N_T }, (_, i) => (
                <Jig key={`t${i}`} x={cur[i * 3]} y={cur[i * 3 + 1]} opacity={cur[i * 3 + 2]} delay={i * 0.17}>
                  <circle r={6} fill={ion.color} stroke="var(--v-ink)" strokeOpacity={0.3} strokeWidth={0.8} />
                </Jig>
              ))}
            </g>

            {/* Йони във вътрешния електролит */}
            {I_POS.map((p, i) => (
              <Jig key={`i${i}`} x={p[0]} y={p[1]} delay={i * 0.27}>
                <circle r={5.5} fill={ion.color} opacity={0.85} />
              </Jig>
            ))}

            {/* Легенда */}
            <g transform="translate(560 140)">
              <rect x={-8} y={-22} width={206} height={118} rx={10} fill="var(--surface)" stroke="var(--line)" />
              <circle cx={8} cy={-4} r={6} fill={ion.color} />
              <Txt x={22} y={0} size={11}>
                целеви йон ({ion.sym})
              </Txt>
              <circle cx={8} cy={20} r={4.5} fill="var(--v-soft)" />
              <Txt x={22} y={24} size={11}>
                други йони в пробата
              </Txt>
              <circle cx={8} cy={44} r={6} fill="var(--bad)" />
              <circle cx={22} cy={44} r={6} fill="var(--info)" />
              <Txt x={34} y={48} size={11}>
                заряди на границите
              </Txt>
              <line x1={0} y1={70} x2={16} y2={70} stroke={ion.color} strokeWidth={2.2} className="flow-line" />
              <Txt x={22} y={74} size={11}>
                селективно свързване
              </Txt>
            </g>
          </svg>
        </div>

        <ExplainPanel eyebrow="Избран електрод" title={ion.title}>
          {ion.body.map((p, i) => (
            <p key={i} className="!m-0">
              <RichText text={p} />
            </p>
          ))}
          <p className="!m-0 text-sm text-muted">
            <RichText
              text={`Колкото **по-висока е активността** на ${ion.sym} в пробата, толкова повече йони се свързват с мембраната и толкова по-голям е зарядът, а потенциалът расте **логаритмично**${ion.sign === -1 ? ' (с обратен знак за анион)' : ''}.`}
            />
          </p>
        </ExplainPanel>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
            <Slider
              id={`${uid}-c`}
              label={`Концентрация на ${ion.sym} в пробата`}
              value={c}
              min={ion.min}
              max={ion.max}
              step={ion.step}
              display={`${fmt(c, ion.decimals)} mmol/L`}
              hint="Условно приемаме активността да е пропорционална на концентрацията."
              onChange={(v) => setConc((s) => ({ ...s, [ionId]: v }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <ValuePill label="Потенциал ΔE" value={`${E >= 0 ? '+' : ''}${fmt(E, 1)}`} unit="mV" kind="measured" />
              <ValuePill label="Теоретичен наклон (37 °C)" value={fmt(S_THEORY, 1)} unit="mV/декада" kind="neutral" />
            </div>
            <NernstChart ion={ion} c={c} slope={S_THEORY} />
          </div>

          <CalibrationPanel ion={ion} c={c} realSlope={realSlope} setRealSlope={setRealSlope} uid={uid} />
        </div>
      </div>
    </VizFrame>
  );
}

/* ───────── Диаграма на Nernst ───────── */
function NernstChart({ ion, c, slope }: { ion: IonInfo; c: number; slope: number }) {
  const W = 380;
  const H = 230;
  const L = 52;
  const R = 66;
  const Tp = 14;
  const B = 44;
  const [pmin, pmax] = ion.plot;
  const lmin = Math.log10(pmin);
  const lmax = Math.log10(pmax);
  const eMax = 110;
  const px = (cc: number) => L + ((Math.log10(cc) - lmin) / (lmax - lmin)) * (W - L - R);
  const py = (e: number) => Tp + (1 - (e + eMax) / (2 * eMax)) * (H - Tp - B);
  const e1 = eRel(ion, pmin, slope);
  const e2 = eRel(ion, pmax, slope);
  const decades: number[] = [];
  for (let d = lmin; d <= lmax + 1e-9; d += 1) decades.push(10 ** d);
  const ec = eRel(ion, c, slope);
  // отсечка „10×“ – една пълна декада
  const c10a = 10 ** Math.floor(Math.log10(ion.mid));
  const c10b = c10a * 10;
  const showDecade = c10b <= pmax * 1.0001;
  return (
    <div>
      <p className="!m-0 mb-1 text-sm font-bold text-ink">Зависимост на потенциала от log(концентрация)</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg mx-auto block h-auto w-full max-w-[560px]" role="img" aria-label="Права линия: потенциалът расте с логаритъма на концентрацията, наклон около 61,5 mV на декада">
        {[-100, -50, 0, 50, 100].map((e) => (
          <g key={e}>
            <line x1={L} x2={W - R} y1={py(e)} y2={py(e)} stroke={e === 0 ? 'var(--v-soft)' : 'var(--v-grid)'} strokeDasharray={e === 0 ? '' : '3 3'} />
            <Txt x={L - 6} y={py(e) + 4} anchor="end" size={10} color="var(--v-soft)">
              {e > 0 ? '+' : ''}
              {e}
            </Txt>
          </g>
        ))}
        {decades.map((d) => (
          <g key={d}>
            <line x1={px(d)} x2={px(d)} y1={Tp} y2={H - B} stroke="var(--v-grid)" />
            <Txt x={px(d)} y={H - B + 16} anchor="middle" size={10} color="var(--v-soft)">
              {fmt(d, 0)}
            </Txt>
          </g>
        ))}
        <line x1={L} x2={L} y1={Tp} y2={H - B} stroke="var(--v-soft)" />
        <line x1={px(pmin)} y1={py(e1)} x2={px(pmax)} y2={py(e2)} stroke={ion.color} strokeWidth={3} />
        {showDecade && (
          <g>
            <line x1={px(c10a)} x2={px(c10b)} y1={py(eRel(ion, c10a, slope))} y2={py(eRel(ion, c10a, slope))} stroke="var(--v-ink)" strokeDasharray="3 3" />
            <line x1={px(c10b)} x2={px(c10b)} y1={py(eRel(ion, c10a, slope))} y2={py(eRel(ion, c10b, slope))} stroke="var(--v-ink)" strokeDasharray="3 3" />
            {['10× →', `${ion.sign === 1 ? '+' : '−'}${fmt(slope, 1)} mV`, 'на декада'].map((line, k) => (
              <Txt key={k} x={px(c10b) + 6} y={(py(eRel(ion, c10a, slope)) + py(eRel(ion, c10b, slope))) / 2 - 8 + k * 12} size={10} weight={700}>
                {line}
              </Txt>
            ))}
          </g>
        )}
        <line x1={px(c)} x2={px(c)} y1={py(ec)} y2={H - B} stroke="var(--accent)" strokeDasharray="4 4" />
        <circle cx={px(c)} cy={py(ec)} r={6} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
        <Txt x={(L + W - R) / 2} y={H - 8} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
          концентрация, mmol/L (логаритмична ос)
        </Txt>
        <g transform={`rotate(-90 12 ${(Tp + H - B) / 2})`}>
          <Txt x={12} y={(Tp + H - B) / 2} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
            ΔE, mV
          </Txt>
        </g>
      </svg>
    </div>
  );
}

/* ───────── Калибрация на ISE ───────── */
function CalibrationPanel({
  ion,
  c,
  realSlope,
  setRealSlope,
  uid,
}: {
  ion: IonInfo;
  c: number;
  realSlope: number;
  setRealSlope: (v: number) => void;
  uid: string;
}) {
  const c1 = ion.calLow;
  const c2 = ion.calHigh;
  const E1 = eRel(ion, c1, realSlope);
  const E2 = eRel(ion, c2, realSlope);
  const Es = eRel(ion, c, realSlope);
  const slopeCalc = (E2 - E1) / (ion.sign * (Math.log10(c2) - Math.log10(c1)));
  const cCal = c1 * 10 ** ((Es - E1) / (ion.sign * slopeCalc));
  const cOld = ion.mid * 10 ** (Es / (ion.sign * S_THEORY));
  const err = ((cOld - c) / c) * 100;
  const d = ion.decimals;
  return (
    <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
      <div>
        <p className="!m-0 text-sm font-bold text-ink">Защо е нужна калибрация на ISE?</p>
        <p className="!m-0 mt-1 text-sm text-muted">
          Анализаторът измерва <strong>напрежение</strong>, а не концентрация. С <strong>два калибратора</strong> с известна концентрация той определя действителния наклон на електрода и превръща напрежението на пробата в концентрация. Износеният електрод има по-нисък наклон.
        </p>
      </div>
      <Slider
        id={`${uid}-slope`}
        label="Реален наклон на електрода (износване)"
        value={realSlope}
        min={50}
        max={61.5}
        step={0.5}
        display={`${fmt(realSlope, 1)} mV/декада`}
        hint="Теоретичният наклон при 37 °C е ≈ 61,5 mV/декада; износването го намалява."
        onChange={setRealSlope}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <th className="py-1.5 pr-3 font-semibold">Проба</th>
              <th className="py-1.5 pr-3 font-semibold">Концентрация</th>
              <th className="py-1.5 font-semibold">Измерен потенциал ΔE</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            <tr className="border-b border-line/60">
              <td className="py-1.5 pr-3">Калибратор 1</td>
              <td className="py-1.5 pr-3">{fmt(c1, d)} mmol/L</td>
              <td className="py-1.5">{fmt(E1, 1)} mV</td>
            </tr>
            <tr className="border-b border-line/60">
              <td className="py-1.5 pr-3">Калибратор 2</td>
              <td className="py-1.5 pr-3">{fmt(c2, d)} mmol/L</td>
              <td className="py-1.5">{fmt(E2, 1)} mV</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-3 font-semibold">Проба (от плъзгача)</td>
              <td className="py-1.5 pr-3 font-semibold">{fmt(c, d)} mmol/L</td>
              <td className="py-1.5 font-semibold">{fmt(Es, 1)} mV</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ValuePill label="Наклон от калибраторите" value={fmt(slopeCalc, 1)} unit="mV/декада" kind="calculated" />
        <ValuePill label="Резултат след калибрация" value={fmt(cCal, d + 1)} unit="mmol/L" kind="calculated" />
        <ValuePill label="Със „стар“ наклон 61,5" value={fmt(cOld, d + 1)} unit="mmol/L" kind="calculated" />
        <ValuePill label="Отклонение без калибрация" value={`${err > 0 ? '+' : ''}${fmt(err, 1)}`} unit="%" kind="calculated" />
      </div>
      <p className="!m-0 text-xs leading-relaxed text-muted">
        Илюстрация: ако анализаторът продължи да ползва теоретичния наклон, а електродът е износен, резултатите се изместват – особено далеч от средната точка. Реалните анализатори използват собствени процедури и калибратори; стойностите тук са образователни.
      </p>
    </div>
  );
}
