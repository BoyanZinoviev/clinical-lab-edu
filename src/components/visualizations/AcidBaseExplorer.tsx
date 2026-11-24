import { useId, useState } from 'react';
import { VizFrame, ExplainPanel, ValuePill } from '../ui/VizFrame';
import { Segmented, Slider } from '../ui/Controls';
import { useTween } from '../../hooks/useTween';
import { Txt } from './shared';
import { baseExcess, bicarbonate, classify, mmHgToKPa, REF, SCENARIOS } from '../../lib/acidBase';
import type { Classification } from '../../lib/acidBase';
import { clamp, fmt } from '../../lib/stats';

const LEVEL_LABEL = { low: 'ниско', normal: 'в нормата', high: 'високо' } as const;
const LEVEL_COLOR = { low: 'var(--info)', normal: 'var(--ok)', high: 'var(--bad)' } as const;

export function AcidBaseExplorer() {
  const uid = useId().replace(/:/g, '');
  const [pH, setPH] = useState(7.4);
  const [pCO2, setPCO2] = useState(40);
  const [presetId, setPresetId] = useState('normal');

  const hco3 = bicarbonate(pH, pCO2);
  const be = baseExcess(pH, hco3);
  const cls = classify(pH, pCO2);
  const ratio = hco3 / (0.0307 * pCO2);

  const pick = (id: string) => {
    const sc = SCENARIOS.find((s) => s.id === id);
    if (!sc) return;
    setPresetId(id);
    setPH(sc.pH);
    setPCO2(sc.pCO2);
  };

  return (
    <VizFrame
      title="Изследовател на киселинно-алкалния баланс"
      subtitle="Промени измерените pH и pCO₂ и виж как се променя изчисленият HCO₃⁻ и към какъв тип нарушение сочи комбинацията."
      icon="sliders"
      note="Образователен модел. pH и pCO₂ са измерени; HCO₃⁻ и BE са изчислени по формули. Референтните граници са ориентировъчни и зависят от лабораторията и метода. Алгоритъмът не е клиничен и не служи за решения за конкретен пациент."
    >
      <div className="space-y-4">
        <Segmented
          label="Готови примери"
          value={presetId}
          onChange={pick}
          size="sm"
          options={SCENARIOS.map((s) => ({ value: s.id, label: s.label, sub: s.sub }))}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-xl border border-line" style={{ background: 'var(--v-panel)' }}>
            <BalanceBeam pH={pH} pCO2={pCO2} hco3={hco3} ratio={ratio} uid={uid} />
          </div>
          <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
            <Strip label="pH" kind="measured" value={pH} min={6.9} max={7.8} band={REF.pH} level={cls.pH} format={(v) => fmt(v, 2)} />
            <Strip label="pCO₂ (mmHg)" kind="measured" value={pCO2} min={10} max={100} band={REF.pCO2} level={cls.pCO2} format={(v) => fmt(v, 0)} />
            <Strip label="HCO₃⁻ (mmol/L)" kind="calculated" value={hco3} min={5} max={45} band={REF.hco3} level={cls.hco3} format={(v) => fmt(v, 1)} />
          </div>
        </div>

        <div className="grid gap-4 rounded-xl border border-line bg-surface p-4 md:grid-cols-2">
          <Slider
            id={`${uid}-ph`}
            label="pH (измерено)"
            value={pH}
            min={7.0}
            max={7.8}
            step={0.01}
            display={fmt(pH, 2)}
            hint="Ориентировъчна норма около 7,35–7,45."
            onChange={(v) => {
              setPH(v);
              setPresetId('');
            }}
          />
          <Slider
            id={`${uid}-co2`}
            label="pCO₂ (измерено)"
            value={pCO2}
            min={15}
            max={100}
            step={1}
            display={`${fmt(pCO2, 0)} mmHg`}
            hint={`≈ ${fmt(mmHgToKPa(pCO2), 1)} kPa. Ориентировъчна норма около 35–45 mmHg.`}
            onChange={(v) => {
              setPCO2(v);
              setPresetId('');
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ValuePill label="pH" value={fmt(pH, 2)} kind="measured" />
          <ValuePill label="pCO₂" value={fmt(pCO2, 0)} unit="mmHg" kind="measured" />
          <ValuePill label="HCO₃⁻" value={fmt(hco3, 1)} unit="mmol/L" kind="calculated" />
          <ValuePill label="BE (приблизително)" value={`${be > 0 ? '+' : ''}${fmt(be, 1)}`} unit="mmol/L" kind="calculated" />
        </div>

        <Verdict cls={cls} />

        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="!m-0 mb-1 text-sm font-bold text-ink">Henderson–Hasselbalch</p>
          <p className="!m-0 font-mono text-[0.95rem] text-ink" style={{ fontFamily: 'var(--font-mono)' }}>
            pH = 6,1 + log [ HCO₃⁻ / (0,0307 × pCO₂) ]
          </p>
          <p className="!m-0 mt-2 text-sm text-muted">
            Сега: 6,1 + log ( {fmt(hco3, 1)} / {fmt(0.0307 * pCO2, 2)} ) = 6,1 + log ( {fmt(ratio, 1)} ) = <strong className="text-ink">{fmt(6.1 + Math.log10(ratio), 2)}</strong>. При нормално pH отношението е около 20 : 1.
            Респираторният компонент е pCO₂ (белите дробове), метаболитният – HCO₃⁻ (бъбреците и метаболизмът).
          </p>
        </div>

        <DisorderTable active={cls.title} />
      </div>
    </VizFrame>
  );
}

/* ───────── Везна ───────── */
function BalanceBeam({ pH, pCO2, hco3, ratio, uid }: { pH: number; pCO2: number; hco3: number; ratio: number; uid: string }) {
  const target = clamp((pH - 7.4) * 100, -28, 28);
  const [angle] = useTween([target], 4);
  const rad = (angle * Math.PI) / 180;
  const cx = 180;
  const cy = 86;
  const arm = 120;
  const lx = cx - arm * Math.cos(rad);
  const ly = cy - arm * Math.sin(rad);
  const rx = cx + arm * Math.cos(rad);
  const ry = cy + arm * Math.sin(rad);
  const tone = pH < REF.pH[0] ? 'var(--info)' : pH > REF.pH[1] ? 'var(--bad)' : 'var(--ok)';
  const word = pH < REF.pH[0] ? 'кисело' : pH > REF.pH[1] ? 'алкално' : 'равновесие';

  const pan = (x: number, y: number, title: string, sub: string, val: string, color: string) => (
    <g>
      <line x1={x} y1={y} x2={x - 40} y2={y + 46} stroke="var(--v-soft)" strokeWidth={1.6} />
      <line x1={x} y1={y} x2={x + 40} y2={y + 46} stroke="var(--v-soft)" strokeWidth={1.6} />
      <rect x={x - 48} y={y + 46} width={96} height={9} rx={4} fill={color} />
      <rect x={x - 42} y={y + 62} width={84} height={44} rx={8} fill="var(--surface)" stroke="var(--line)" />
      <Txt x={x} y={y + 78} anchor="middle" size={11} weight={800}>
        {title}
      </Txt>
      <Txt x={x} y={y + 91} anchor="middle" size={11} weight={800} mono color={color}>
        {val}
      </Txt>
      <Txt x={x} y={y + 102} anchor="middle" size={8.5} color="var(--v-soft)">
        {sub}
      </Txt>
    </g>
  );

  return (
    <svg viewBox="0 0 360 250" className="viz-svg mx-auto block h-auto w-full max-w-[480px]" role="img" aria-label={`Везна на киселинно-алкалния баланс: ${word}, pH ${fmt(pH, 2)}`}>
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" x2="1">
          <stop offset="0" stopColor="var(--info)" stopOpacity="0.25" />
          <stop offset="0.5" stopColor="var(--ok)" stopOpacity="0.25" />
          <stop offset="1" stopColor="var(--bad)" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect x={10} y={8} width={340} height={6} rx={3} fill={`url(#${uid}-g)`} />
      <Txt x={14} y={28} size={9.5} color="var(--v-soft)">
        ацидемия
      </Txt>
      <Txt x={346} y={28} anchor="end" size={9.5} color="var(--v-soft)">
        алкалемия
      </Txt>
      <Txt x={cx} y={28} anchor="middle" size={11} weight={800} color={tone}>
        {word} · pH {fmt(pH, 2)}
      </Txt>

      {/* стойка */}
      <polygon points={`${cx},${cy} ${cx - 16},${cy + 86} ${cx + 16},${cy + 86}`} fill="var(--v-metal)" opacity={0.7} />
      <rect x={cx - 34} y={cy + 86} width={68} height={8} rx={3} fill="var(--v-metal)" />
      {/* гредата */}
      <line x1={lx} y1={ly} x2={rx} y2={ry} stroke="var(--v-ink)" strokeWidth={6} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={7} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />

      {pan(lx, ly, 'CO₂', 'дишане', `${fmt(pCO2, 0)} mmHg`, 'var(--v-k)')}
      {pan(rx, ry, 'HCO₃⁻', 'метаболизъм/бъбреци', `${fmt(hco3, 1)} mmol/L`, 'var(--v-cl)')}

      <Txt x={cx} y={cy + 112} anchor="middle" size={10} color="var(--v-soft)">
        HCO₃⁻ : (0,0307·pCO₂) = {fmt(ratio, 1)} : 1
      </Txt>
      <Txt x={cx} y={cy + 126} anchor="middle" size={9.5} color="var(--v-soft)">
        нормално ≈ 20 : 1 → pH ≈ 7,40
      </Txt>
    </svg>
  );
}

/* ───────── Лента с референтна зона ───────── */
function Strip({
  label,
  value,
  min,
  max,
  band,
  level,
  format,
  kind,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  band: readonly [number, number];
  level: 'low' | 'normal' | 'high';
  format: (v: number) => string;
  kind: 'measured' | 'calculated';
}) {
  const W = 300;
  const x = (v: number) => 8 + ((clamp(v, min, max) - min) / (max - min)) * (W - 16);
  const color = LEVEL_COLOR[level];
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-ink">
          {label}
          <span className="ml-2 rounded bg-surface2 px-1.5 text-[0.62rem] font-bold uppercase tracking-wide text-muted">{kind === 'measured' ? 'измерена' : 'изчислена'}</span>
        </span>
        <span className="text-sm font-bold tabular-nums" style={{ color }}>
          {format(value)} · {LEVEL_LABEL[level]}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} 30`} className="viz-svg mt-1 block h-auto w-full" role="img" aria-label={`${label}: ${format(value)}, ${LEVEL_LABEL[level]}`}>
        <rect x={8} y={12} width={W - 16} height={8} rx={4} fill="var(--v-grid)" />
        <rect x={x(band[0])} y={12} width={x(band[1]) - x(band[0])} height={8} rx={2} fill="var(--ok)" opacity={0.55} />
        <polygon points={`${x(value)},9 ${x(value) - 6},0 ${x(value) + 6},0`} fill={color} />
        <line x1={x(value)} x2={x(value)} y1={9} y2={24} stroke={color} strokeWidth={2.5} />
        <Txt x={8} y={30} size={8.5} color="var(--v-soft)">
          {format(min)}
        </Txt>
        <Txt x={W - 8} y={30} anchor="end" size={8.5} color="var(--v-soft)">
          {format(max)}
        </Txt>
      </svg>
    </div>
  );
}

/* ───────── Извод ───────── */
function Verdict({ cls }: { cls: Classification }) {
  const eyebrow = cls.tone === 'ok' ? 'В рамките на нормата' : cls.tone === 'acid' ? 'Ацидоза' : cls.tone === 'alk' ? 'Алкалоза' : 'Смесено/компенсирано';
  return (
    <ExplainPanel eyebrow={eyebrow} title={cls.title}>
      <p className="!m-0">{cls.text}</p>
      <p className="!m-0 text-sm text-muted">Образователен извод по трите показателя – не заменя клиничната преценка и не е алгоритъм за решения за пациент.</p>
    </ExplainPanel>
  );
}

/* ───────── Таблица на първичните нарушения ───────── */
function DisorderTable({ active }: { active: string }) {
  const rows: { title: string; ph: string; primary: string; comp: string }[] = [
    { title: 'Респираторна ацидоза', ph: '↓', primary: 'pCO₂ ↑', comp: 'HCO₃⁻ ↑ (бъбречна компенсация)' },
    { title: 'Респираторна алкалоза', ph: '↑', primary: 'pCO₂ ↓', comp: 'HCO₃⁻ ↓ (бъбречна компенсация)' },
    { title: 'Метаболитна ацидоза', ph: '↓', primary: 'HCO₃⁻ ↓', comp: 'pCO₂ ↓ (хипервентилация)' },
    { title: 'Метаболитна алкалоза', ph: '↑', primary: 'HCO₃⁻ ↑', comp: 'pCO₂ ↑ (хиповентилация)' },
  ];
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <caption className="px-4 pt-3 text-left text-sm font-bold text-ink">Четирите първични нарушения</caption>
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-2 font-semibold">Нарушение</th>
            <th className="px-4 py-2 font-semibold">pH</th>
            <th className="px-4 py-2 font-semibold">Първична промяна</th>
            <th className="px-4 py-2 font-semibold">Компенсация</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.title} className={`border-b border-line/60 last:border-0 ${active === r.title ? 'bg-accent-soft/60' : ''}`}>
              <th scope="row" className="px-4 py-2 font-semibold text-ink">
                {r.title}
              </th>
              <td className="px-4 py-2 font-bold tabular-nums">{r.ph}</td>
              <td className="px-4 py-2">{r.primary}</td>
              <td className="px-4 py-2 text-muted">{r.comp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
