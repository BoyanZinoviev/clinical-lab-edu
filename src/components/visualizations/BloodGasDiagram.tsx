import { useId, useState } from 'react';
import { VizFrame, ExplainPanel, ValuePill } from '../ui/VizFrame';
import { StepControls, Segmented } from '../ui/Controls';
import { RichText } from '../ui/RichText';
import { useStepper } from '../../hooks/useStepper';
import { useTween } from '../../hooks/useTween';
import { Jig, Txt } from './shared';
import { baseExcess, bicarbonate, mmHgToKPa, SCENARIOS } from '../../lib/acidBase';
import { fmt } from '../../lib/stats';

const STAGES: { label: string; title: string; body: string[] }[] = [
  {
    label: 'Проба',
    title: 'Артериална проба цяла кръв',
    body: [
      'Пробата е **артериална цяла кръв** в спринцовка със **сух хепарин**, без мехурчета и анализирана бързо – pO₂ и pCO₂ са силно зависими от преаналитичните условия.',
      'Анализаторът ще **измери** pH, pCO₂ и pO₂, а останалите показатели ще **изчисли**.',
    ],
  },
  {
    label: 'Камера',
    title: 'Пробата влиза в термостатираната камера',
    body: [
      'Малък обем кръв се засмуква в **измервателната камера**, която се поддържа на **37 °C**. Температурата е важна, защото pH, pCO₂ и pO₂ зависят от нея.',
      'В камерата пробата докосва едновременно трите сензора и референтния електрод.',
    ],
  },
  {
    label: 'Сензори',
    title: 'Три различни сензора',
    body: [
      '**pH електрод** (стъклен, потенциометричен), **pCO₂ електрод на Severinghaus** (pH електрод с CO₂-пропусклива мембрана) и **pO₂ електрод на Clark** (амперометричен).',
      'Избери сензор по-долу и виж как е устроен и как преобразува физична величина в електричен сигнал.',
    ],
  },
  {
    label: 'Сигнали',
    title: 'Електрически сигнали',
    body: [
      'Сензорите дават **сигнали**: потенциали (**mV**) за pH и pCO₂ и ток (**nA**) за pO₂. Тези сигнали са „суровото“ измерване.',
      'С помощта на калибрациите анализаторът превръща сигналите в pH, pCO₂ и pO₂.',
    ],
  },
  {
    label: 'Изчисляване',
    title: 'Изчисляване на допълнителните показатели',
    body: [
      'От **измерените** pH и pCO₂ процесорът **изчислява** HCO₃⁻ (уравнение на Henderson–Hasselbalch) и BE; ако е необходимо – и други показатели (напр. sO₂).',
      'Изчислените стойности **не са измерени** – ако измерената е грешна, изчислената я „наследява“.',
    ],
  },
  {
    label: 'Резултати',
    title: 'Резултати: измерени и изчислени',
    body: [
      'Анализаторът докладва **измерените** (pH, pCO₂, pO₂) и **изчислените** (HCO₃⁻, BE) величини, обикновено с температурата, при която са определени.',
      'Интерпретацията изисква **съвместен прочит** на всички показатели и клиничен контекст.',
    ],
  },
];

type SensorId = 'ph' | 'pco2' | 'po2';

const SENSORS: Record<SensorId, { sym: string; name: string; type: string; unit: string; color: string; x: number; body: string[] }> = {
  ph: {
    sym: 'pH',
    name: 'pH електрод (стъклен)',
    type: 'Потенциометричен',
    unit: 'mV',
    color: 'var(--v-dye-free)',
    x: 287,
    body: [
      'Тънка **H⁺-чувствителна стъклена мембрана** разделя пробата от вътрешен разтвор с постоянно pH. Потенциалът на мембраната зависи **линейно от pH**: при 37 °C около **−61,5 mV на pH единица**.',
      'Измерва се напрежението между стъкления и референтния електрод. Калибрацията е с **два буфера** с известно pH.',
    ],
  },
  pco2: {
    sym: 'pCO₂',
    name: 'pCO₂ електрод (Severinghaus)',
    type: 'Потенциометричен (непряк)',
    unit: 'mV',
    color: 'var(--v-k)',
    x: 397,
    body: [
      'CO₂ от пробата **дифундира през CO₂-пропусклива мембрана** в тънък слой **бикарбонатен електролит** и реагира с вода: CO₂ + H₂O ⇌ H⁺ + HCO₃⁻.',
      'Промяната на **pH на електролита** се отчита от вътрешен стъклен pH електрод. Колкото по-високо е pCO₂, толкова по-ниско е pH на слоя – т.е. **pCO₂ се определя непряко чрез pH**.',
    ],
  },
  po2: {
    sym: 'pO₂',
    name: 'pO₂ електрод (Clark)',
    type: 'Амперометричен',
    unit: 'nA',
    color: 'var(--v-cl)',
    x: 507,
    body: [
      'O₂ **дифундира през O₂-пропусклива мембрана** до **платинен катод**, към който е приложено постоянно **поляризиращо напрежение**. Там O₂ се **редуцира**: O₂ + 2H₂O + 4e⁻ → 4OH⁻; на Ag/AgCl анода протича реакция: Ag + Cl⁻ → AgCl + e⁻.',
      'Протича **ток** (от порядъка на nA), **пропорционален на pO₂**. За разлика от потенциометрията, тук измерваното вещество **се консумира** на електрода.',
    ],
  },
};

export function BloodGasDiagram() {
  const uid = useId().replace(/:/g, '');
  const stepper = useStepper(STAGES.length, 5600);
  const [sensor, setSensor] = useState<SensorId>('ph');
  const [scId, setScId] = useState('normal');
  const stage = stepper.step;
  const s = STAGES[stage];
  const sc = SCENARIOS.find((x) => x.id === scId) ?? SCENARIOS[0];

  const hco3 = bicarbonate(sc.pH, sc.pCO2);
  const be = baseExcess(sc.pH, hco3);

  // [дължина на пълнеж в камерата, дължина на кръвта в спринцовката]
  const cur = useTween([stage >= 1 ? 390 : 0, stage >= 1 ? 22 : 84], 2.6);
  const sensorsOn = stage >= 2;
  const wiresOn = stage >= 3;
  const info = SENSORS[sensor];

  const wires: { id: SensorId; y: number; unit: string }[] = [
    { id: 'ph', y: 22, unit: 'mV' },
    { id: 'pco2', y: 40, unit: 'mV' },
    { id: 'po2', y: 58, unit: 'nA' },
  ];

  return (
    <VizFrame
      title="Анализатор за кръвни газове – от пробата до резултата"
      subtitle="Шест етапа, три сензора и разграничение между измерени и изчислени показатели."
      icon="gauge"
      note="Схематична образователна илюстрация. Конструкцията на сензорите и измервателната камера се различава при различните анализатори. Стойностите са илюстративни, а не данни на реален пациент."
    >
      <div className="space-y-4">
        <Segmented
          label="Анализирана проба (илюстративна)"
          value={scId}
          onChange={setScId}
          size="sm"
          options={SCENARIOS.map((x) => ({ value: x.id, label: x.label, sub: x.sub }))}
        />

        <div className="overflow-hidden rounded-xl border border-line" style={{ background: 'var(--v-panel)' }}>
          <svg viewBox="0 0 780 300" className="viz-svg block h-auto w-full" role="img" aria-label={`Схема на анализатор за кръвни газове, етап ${stage + 1}: ${s.title}`}>
            <defs>
              <clipPath id={`${uid}-ch`}>
                <rect x={192} y={152} width={388} height={38} rx={4} />
              </clipPath>
            </defs>

            <Txt x={20} y={34} size={15} weight={800}>
              {stage + 1} · {s.label}
            </Txt>
            <Txt x={20} y={54} size={12} color="var(--v-soft)">
              {s.title}
            </Txt>

            {/* Проводници към процесора */}
            {wires.map((w) => {
              const sx = SENSORS[w.id].x;
              return (
                <g key={w.id}>
                  <polyline
                    points={`${sx},84 ${sx},${w.y} 612,${w.y}`}
                    fill="none"
                    stroke={wiresOn ? SENSORS[w.id].color : 'var(--v-soft)'}
                    strokeWidth={2.2}
                    strokeLinejoin="round"
                    className={wiresOn ? 'flow-line' : undefined}
                    opacity={wiresOn ? 1 : 0.45}
                  />
                  <Txt x={602} y={w.y - 4} anchor="end" size={10} weight={700} color="var(--v-soft)" opacity={wiresOn ? 1 : 0}>
                    {w.unit}
                  </Txt>
                </g>
              );
            })}

            {/* Процесор */}
            <rect x={612} y={8} width={156} height={70} rx={10} fill="var(--v-detector)" />
            <Txt x={690} y={32} anchor="middle" size={12} weight={800} color="#ffffff">
              Процесор
            </Txt>
            <Txt x={690} y={50} anchor="middle" size={10.5} color="#ffffff" opacity={stage >= 4 ? 1 : 0.55}>
              {stage >= 4 ? 'изчислява HCO₃⁻, BE' : 'калибрации → стойности'}
            </Txt>

            {/* Спринцовка */}
            <rect x={24} y={158} width={84} height={26} rx={4} fill="var(--v-liquid)" stroke="var(--v-glass)" strokeWidth={2.5} />
            <rect x={24 + (84 - cur[1])} y={160} width={cur[1]} height={22} rx={3} fill="var(--v-blood)" opacity={0.85} />
            <rect x={6} y={164} width={18} height={14} rx={2} fill="var(--v-metal)" />
            <line x1={108} y1={171} x2={192} y2={171} stroke="var(--v-glass)" strokeWidth={3} />
            <Txt x={66} y={204} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
              артериална кръв
            </Txt>
            <Txt x={66} y={218} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
              (хепарин)
            </Txt>

            {/* Термостат */}
            <rect x={182} y={142} width={408} height={58} rx={8} fill="none" stroke="var(--v-hapten)" strokeWidth={1.8} strokeDasharray="5 4" />
            <Txt x={386} y={218} anchor="middle" size={11} weight={700} color="var(--v-hapten)">
              термостат 37 °C – измервателна камера
            </Txt>

            {/* Канал */}
            <rect x={192} y={152} width={388} height={38} rx={4} fill="var(--v-liquid)" stroke="var(--v-glass)" strokeWidth={2.5} />
            <g clipPath={`url(#${uid}-ch)`}>
              <rect x={192} y={152} width={cur[0]} height={38} fill="var(--v-blood)" opacity={0.8} />
              {stage >= 1 && <line x1={192} y1={171} x2={192 + cur[0]} y2={171} stroke="#ffffff" strokeWidth={1.5} opacity={0.5} className="flow-line" />}
            </g>

            {/* Сензори */}
            {(Object.keys(SENSORS) as SensorId[]).map((id) => {
              const sInfo = SENSORS[id];
              const active = sensorsOn && sensor === id;
              return (
                <g key={id}>
                  {active && <rect x={sInfo.x - 24} y={78} width={48} height={90} rx={9} fill="none" stroke="var(--accent)" strokeWidth={2.5} className="pulse-ring" />}
                  <rect x={sInfo.x - 17} y={84} width={34} height={70} rx={5} fill="var(--v-metal)" stroke="var(--v-ink)" strokeOpacity={0.45} />
                  <rect x={sInfo.x - 17} y={140} width={34} height={14} rx={3} fill={sInfo.color} opacity={sensorsOn ? 1 : 0.5} />
                  <Txt x={sInfo.x} y={116} anchor="middle" size={11} weight={800} color="#ffffff">
                    {sInfo.sym}
                  </Txt>
                  <Txt x={sInfo.x} y={134} anchor="middle" size={9} weight={600} color="#ffffff" opacity={0.85}>
                    {sInfo.unit}
                  </Txt>
                </g>
              );
            })}

            {/* Референтен електрод */}
            <rect x={540} y={188} width={22} height={52} rx={4} fill="var(--v-metal)" stroke="var(--v-ink)" strokeOpacity={0.45} />
            <Txt x={551} y={256} anchor="middle" size={10} color="var(--v-soft)" weight={600}>
              референтен
            </Txt>
            <Txt x={551} y={269} anchor="middle" size={10} color="var(--v-soft)" weight={600}>
              електрод
            </Txt>

            {/* Мехурчета в кръвта – леко движение */}
            {stage >= 1 && [260, 330, 420, 460].map((x, i) => (
              <Jig key={i} x={x} y={171} delay={i * 0.3}>
                <circle r={3} fill="#ffffff" opacity={0.25} />
              </Jig>
            ))}

            {/* Резултати – мини табло */}
            <g transform="translate(612 100)">
              <rect x={0} y={0} width={156} height={170} rx={10} fill="var(--surface)" stroke="var(--line)" />
              <Txt x={10} y={20} size={10} weight={800} color="var(--v-soft)">
                РЕЗУЛТАТ
              </Txt>
              {[
                { l: 'pH', v: fmt(sc.pH, 2), show: stage >= 3, calc: false },
                { l: 'pCO₂', v: `${fmt(sc.pCO2, 0)} mmHg`, show: stage >= 3, calc: false },
                { l: 'pO₂', v: `${fmt(sc.pO2, 0)} mmHg`, show: stage >= 3, calc: false },
                { l: 'HCO₃⁻', v: `${fmt(hco3, 1)} mmol/L`, show: stage >= 4, calc: true },
                { l: 'BE', v: `${be > 0 ? '+' : ''}${fmt(be, 1)} mmol/L`, show: stage >= 4, calc: true },
              ].map((r, i) => (
                <g key={r.l} opacity={r.show ? 1 : 0.25}>
                  <rect x={8} y={30 + i * 27} width={5} height={20} rx={2} fill={r.calc ? 'var(--warn)' : 'var(--v-antibody)'} />
                  <Txt x={20} y={45 + i * 27} size={11} weight={700}>
                    {r.l}
                  </Txt>
                  <Txt x={148} y={45 + i * 27} anchor="end" size={11.5} weight={800} mono>
                    {r.show ? r.v : '—'}
                  </Txt>
                </g>
              ))}
            </g>
            <g transform="translate(612 282)">
              <rect x={0} y={-8} width={8} height={8} rx={2} fill="var(--v-antibody)" />
              <Txt x={13} y={0} size={10} color="var(--v-soft)">
                измерена
              </Txt>
              <rect x={72} y={-8} width={8} height={8} rx={2} fill="var(--warn)" />
              <Txt x={85} y={0} size={10} color="var(--v-soft)">
                изчислена
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
          <p className="!m-0 mb-2 text-sm font-bold text-ink">Сензори – избери, за да видиш напречен разрез</p>
          <Segmented<SensorId>
            label="Избор на сензор"
            value={sensor}
            onChange={setSensor}
            options={(Object.keys(SENSORS) as SensorId[]).map((id) => ({ value: id, label: SENSORS[id].sym, sub: SENSORS[id].type }))}
          />
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div className="overflow-hidden rounded-xl border border-line" style={{ background: 'var(--v-panel)' }}>
              <SensorDetail id={sensor} />
            </div>
            <div className="space-y-2 text-[0.93rem] leading-relaxed">
              <h4 className="!m-0 text-base font-bold text-ink">{info.name}</h4>
              <p className="!m-0 text-xs font-semibold uppercase tracking-wide text-muted">
                Вид: {info.type} · сигнал: {info.unit}
              </p>
              {info.body.map((p, i) => (
                <p key={i} className="!m-0 text-ink/90">
                  <RichText text={p} />
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <ValuePill label="pH" value={fmt(sc.pH, 2)} kind="measured" />
          <ValuePill label="pCO₂" value={`${fmt(sc.pCO2, 0)} mmHg`} kind="measured" />
          <ValuePill label="pO₂" value={`${fmt(sc.pO2, 0)} mmHg`} kind="measured" />
          <ValuePill label="HCO₃⁻" value={fmt(hco3, 1)} unit="mmol/L" kind="calculated" />
          <ValuePill label="BE (приблизително)" value={`${be > 0 ? '+' : ''}${fmt(be, 1)}`} unit="mmol/L" kind="calculated" />
        </div>
        <p className="!m-0 text-xs leading-relaxed text-muted">
          pCO₂ в kPa при избраната проба: {fmt(mmHgToKPa(sc.pCO2), 1)}. HCO₃⁻ = 0,0307 × pCO₂ × 10<sup>(pH − 6,1)</sup>; BE е приблизителна образователна формула – анализаторите използват собствени алгоритми.
        </p>
      </div>
    </VizFrame>
  );
}

/* ───────── Напречен разрез на сензор ───────── */
function SensorDetail({ id }: { id: SensorId }) {
  return (
    <svg viewBox="0 0 380 230" className="viz-svg mx-auto block h-auto w-full max-w-[600px]" role="img" aria-label="Напречен разрез на избрания сензор">
      {/* проба (долу) */}
      <rect x={0} y={170} width={380} height={60} fill="var(--v-blood)" opacity={0.35} />
      <Txt x={10} y={222} size={11} weight={700}>
        проба (кръв)
      </Txt>
      {id === 'ph' && <PhDetail />}
      {id === 'pco2' && <Pco2Detail />}
      {id === 'po2' && <Po2Detail />}
    </svg>
  );
}

function PhDetail() {
  return (
    <g>
      {/* вътрешен разтвор */}
      <rect x={90} y={40} width={180} height={110} rx={6} fill="var(--v-liquid)" stroke="var(--v-glass)" strokeWidth={2.5} />
      <Txt x={180} y={128} anchor="middle" size={10.5} color="var(--v-soft)">
        вътрешен разтвор
      </Txt>
      <Txt x={180} y={141} anchor="middle" size={10} color="var(--v-soft)">
        (постоянно pH)
      </Txt>
      {/* Ag/AgCl */}
      <rect x={174} y={0} width={12} height={110} rx={3} fill="var(--v-metal)" stroke="var(--v-ink)" strokeOpacity={0.4} />
      <Txt x={194} y={20} size={10} color="var(--v-soft)" weight={600}>
        Ag/AgCl
      </Txt>
      {/* стъклена мембрана */}
      <rect x={86} y={150} width={188} height={14} rx={7} fill="var(--v-glass)" opacity={0.9} stroke="var(--v-ink)" strokeOpacity={0.4} />
      <Txt x={282} y={157} size={10.5} weight={700}>
        стъклена
      </Txt>
      <Txt x={282} y={170} size={10.5} weight={700}>
        мембрана
      </Txt>
      {/* H+ */}
      {[110, 150, 190, 230, 252, 130].map((x, i) => (
        <Jig key={i} x={x} y={182 + (i % 3) * 10} delay={i * 0.3}>
          <circle r={5.5} fill="var(--bad)" />
          <Txt x={0} y={3.5} anchor="middle" size={8} weight={800} color="#ffffff">
            H⁺
          </Txt>
        </Jig>
      ))}
      <path d="M146 176 v-12" stroke="var(--bad)" strokeWidth={2} className="flow-line" />
      <path d="M214 176 v-12" stroke="var(--bad)" strokeWidth={2} className="flow-line" />
      <Txt x={10} y={20} size={11} weight={800}>
        E ∝ pH
      </Txt>
      <Txt x={10} y={36} size={10} color="var(--v-soft)">
        ≈ −61,5 mV/pH ед. (37 °C)
      </Txt>
    </g>
  );
}

function Pco2Detail() {
  return (
    <g>
      {/* стъклен pH електрод */}
      <path d="M130 0 V70 a50 50 0 0 0 100 0 V0" fill="var(--v-liquid)" stroke="var(--v-glass)" strokeWidth={2.5} />
      <rect x={174} y={0} width={12} height={66} rx={3} fill="var(--v-metal)" stroke="var(--v-ink)" strokeOpacity={0.4} />
      <Txt x={238} y={26} size={10.5} weight={700}>
        вътрешен pH
      </Txt>
      <Txt x={238} y={39} size={10.5} weight={700}>
        електрод
      </Txt>
      {/* бикарбонатен електролит */}
      <rect x={96} y={120} width={168} height={30} fill="var(--v-antibody)" opacity={0.25} />
      <Txt x={104} y={139} size={10} weight={700} color="var(--v-ink)">
        бикарбонатен електролит
      </Txt>
      {/* CO2-пропусклива мембрана */}
      <rect x={90} y={150} width={180} height={12} rx={4} fill="var(--v-metal)" opacity={0.9} stroke="var(--v-ink)" strokeOpacity={0.4} />
      <Txt x={278} y={160} size={10.5} weight={700}>
        CO₂-пропусклива
      </Txt>
      <Txt x={278} y={173} size={10.5} weight={700}>
        мембрана
      </Txt>
      {/* CO2 */}
      {[120, 160, 200, 240].map((x, i) => (
        <g key={x}>
          <Jig x={x} y={190 + (i % 2) * 8} delay={i * 0.4}>
            <circle r={6} fill="var(--v-k)" />
            <Txt x={0} y={3} anchor="middle" size={7.5} weight={800} color="#ffffff">
              CO₂
            </Txt>
          </Jig>
          <path d={`M${x} 180 v-30`} stroke="var(--v-k)" strokeWidth={2} className="flow-line" />
        </g>
      ))}
      <Txt x={10} y={86} size={10.5} weight={800}>
        CO₂ + H₂O ⇌ H⁺ + HCO₃⁻
      </Txt>
      <Txt x={10} y={102} size={10} color="var(--v-soft)">
        ↑ pCO₂ → ↓ pH на слоя
      </Txt>
    </g>
  );
}

function Po2Detail() {
  return (
    <g>
      {/* корпус */}
      <rect x={96} y={30} width={168} height={120} rx={6} fill="var(--v-liquid)" stroke="var(--v-glass)" strokeWidth={2.5} />
      <Txt x={104} y={50} size={10.5} color="var(--v-soft)">
        електролит
      </Txt>
      {/* Pt катод */}
      <rect x={174} y={0} width={12} height={130} rx={3} fill="var(--v-metal)" stroke="var(--v-ink)" strokeOpacity={0.4} />
      <circle cx={180} cy={133} r={7} fill="var(--v-hapten)" stroke="var(--v-ink)" strokeOpacity={0.4} />
      <Txt x={194} y={20} size={10.5} weight={700}>
        Pt катод
      </Txt>
      {/* Ag/AgCl анод (пръстен) */}
      <rect x={104} y={90} width={14} height={50} rx={3} fill="var(--v-detector)" />
      <rect x={242} y={90} width={14} height={50} rx={3} fill="var(--v-detector)" />
      <Txt x={104} y={84} size={10.5} weight={700}>
        Ag/AgCl анод
      </Txt>
      {/* O2-мембрана */}
      <rect x={90} y={150} width={180} height={12} rx={4} fill="var(--v-metal)" opacity={0.9} stroke="var(--v-ink)" strokeOpacity={0.4} />
      <Txt x={278} y={160} size={10.5} weight={700}>
        O₂-пропусклива
      </Txt>
      <Txt x={278} y={173} size={10.5} weight={700}>
        мембрана
      </Txt>
      {/* O2 */}
      {[130, 170, 210, 240].map((x, i) => (
        <g key={x}>
          <Jig x={x} y={192 + (i % 2) * 8} delay={i * 0.35}>
            <circle r={6} fill="var(--v-cl)" />
            <Txt x={0} y={3} anchor="middle" size={8} weight={800} color="#ffffff">
              O₂
            </Txt>
          </Jig>
          <path d={`M${x} 182 v-30`} stroke="var(--v-cl)" strokeWidth={2} className="flow-line" />
        </g>
      ))}
      <Txt x={10} y={20} size={10.5} weight={800}>
        ток ∝ pO₂ (nA)
      </Txt>
      <Txt x={10} y={36} size={10} color="var(--v-soft)">
        O₂ + 2H₂O + 4e⁻ → 4OH⁻
      </Txt>
    </g>
  );
}
