import { useId, useMemo, useState } from 'react';
import { VizFrame, ExplainPanel, ValuePill } from '../ui/VizFrame';
import { IconButton, Segmented, Slider, Toggle } from '../ui/Controls';
import { useSimClock } from '../../hooks/useSimClock';
import { Txt } from './shared';
import { ANALYTES, BASE_ORGANIC, DEAD_TIME, PLATES, RUN_MIN, buildPeaks, resolution, signalAt } from '../../lib/chromatography';
import type { PeakModel } from '../../lib/chromatography';
import { clamp, fmt } from '../../lib/stats';

type Id = 'A' | 'B' | 'C';
const LANES: Record<Id, number> = { A: -12, B: 0, C: 12 };

/* ───────── Геометрия на хроматограмата ───────── */
const PL = 64;
const PR = 756;
const PT = 24;
const PB = 252;
const NP = 400;
const TS = Array.from({ length: NP }, (_, i) => (i * RUN_MIN) / (NP - 1));
const px = (t: number) => PL + (t / RUN_MIN) * (PR - PL);

const gauss = (p: PeakModel, t: number) => p.height * Math.exp(-0.5 * ((t - p.tR) / p.sigma) ** 2);

export function HPLCDiagram() {
  const uid = useId().replace(/:/g, '');
  const clock = useSimClock(RUN_MIN, 0.8);
  const [conc, setConc] = useState<Record<Id, number>>({ A: 1, B: 1, C: 1 });
  const [organic, setOrganic] = useState(BASE_ORGANIC);
  const [plates, setPlates] = useState(PLATES);
  const [sel, setSel] = useState<Id>('B');
  const [showFull, setShowFull] = useState(true);

  const peaks = useMemo(() => buildPeaks(organic, conc, plates), [organic, conc, plates]);
  const base = useMemo(() => buildPeaks(BASE_ORGANIC, { A: 1, B: 1, C: 1 }, PLATES), []);

  const maxH = Math.max(...peaks.map((p) => p.height));
  const ymax = Math.max(500, Math.ceil((maxH * 1.12) / 250) * 250);
  const py = (s: number) => PB - (s / ymax) * (PB - PT);

  const fullPath = useMemo(() => TS.map((t, i) => `${i ? 'L' : 'M'}${px(t).toFixed(1)} ${py(signalAt(peaks, t)).toFixed(1)}`).join(''), [peaks, ymax]); // eslint-disable-line react-hooks/exhaustive-deps
  const areas = useMemo(
    () =>
      peaks.map((p) => {
        const t0 = Math.max(0, p.tR - 4 * p.sigma);
        const t1 = Math.min(RUN_MIN, p.tR + 4 * p.sigma);
        const n = 48;
        let d = `M${px(t0).toFixed(1)} ${py(0)}`;
        for (let i = 0; i <= n; i++) {
          const t = t0 + ((t1 - t0) * i) / n;
          d += `L${px(t).toFixed(1)} ${py(gauss(p, t)).toFixed(1)}`;
        }
        return d + `L${px(t1).toFixed(1)} ${py(0)}Z`;
      }),
    [peaks, ymax], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const time = clock.time;
  const revealW = Math.max(0, px(time) - PL);
  const curSignal = signalAt(peaks, time);
  const selPeak = peaks.find((p) => p.analyte.id === sel) as PeakModel;
  const selBase = base.find((p) => p.analyte.id === sel) as PeakModel;
  const selIdx = peaks.indexOf(selPeak);
  const rsPrev = selIdx > 0 ? resolution(peaks[selIdx - 1], selPeak) : undefined;
  const rsNext = selIdx < peaks.length - 1 ? resolution(selPeak, peaks[selIdx + 1]) : undefined;
  const started = time > 0;
  const finished = time >= RUN_MIN;

  const rsText = (rs: number) => (rs >= 1.5 ? 'пълно разделяне' : rs >= 1 ? 'частично разделяне' : 'припокриване');

  return (
    <VizFrame
      title="HPLC – система и хроматограма в реално време"
      subtitle="Пусни пробега, избери пик и промени концентрацията, състава на подвижната фаза или ефективността на колоната."
      icon="activity"
      note="Образователен модел на изократна обратнофазова хроматография с три условни компонента (A, B, C). Времената, площите, Гаусовите форми и числата за ефективност са илюстративни и не представляват реален метод или реални вещества."
    >
      <div className="space-y-4">
        {/* ───── Схема на системата ───── */}
        <div className="overflow-hidden rounded-xl border border-line" style={{ background: 'var(--v-panel)' }}>
          <svg viewBox="0 0 780 236" className="viz-svg block h-auto w-full" role="img" aria-label="Схема на HPLC система: резервоар, помпа, инжектор, колона, детектор и система за данни">
            <defs>
              <clipPath id={`${uid}-col`}>
                <rect x={312} y={98} width={228} height={44} rx={22} />
              </clipPath>
            </defs>

            {/* Свързващи тръби */}
            {[
              [90, 120, 124, 120],
              [176, 120, 212, 120],
              [268, 120, 312, 120],
              [540, 120, 592, 120],
            ].map((l, i) => (
              <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke="var(--v-glass)" strokeWidth={3.5} />
            ))}
            {clock.playing &&
              [
                [92, 120, 122, 120],
                [178, 120, 210, 120],
                [270, 120, 310, 120],
                [542, 120, 590, 120],
              ].map((l, i) => <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke="var(--accent)" strokeWidth={2} className="flow-line" />)}

            {/* Резервоар */}
            <rect x={20} y={54} width={70} height={92} rx={10} fill="var(--v-liquid)" stroke="var(--v-glass)" strokeWidth={2.5} />
            <rect x={23} y={84} width={64} height={59} rx={8} fill="var(--v-dye-free)" opacity={0.15 + (organic - 25) / 200} />
            <Txt x={55} y={118} anchor="middle" size={11} weight={800} mono>
              {fmt(organic, 0)} %
            </Txt>
            <Txt x={55} y={133} anchor="middle" size={8.5} color="var(--v-soft)">
              органичен
            </Txt>
            <Txt x={55} y={166} anchor="middle" size={11} weight={700}>
              Подвижна фаза
            </Txt>

            {/* Помпа */}
            <circle cx={150} cy={120} r={26} fill="var(--surface)" stroke="var(--v-ink)" strokeWidth={2} />
            <g className={clock.playing ? 'jiggle' : undefined}>
              <rect x={141} y={108} width={18} height={24} rx={3} fill="var(--v-metal)" />
              <rect x={146} y={100} width={8} height={14} rx={2} fill="var(--v-ink)" opacity={0.6} />
            </g>
            <Txt x={150} y={166} anchor="middle" size={11} weight={700}>
              Помпа
            </Txt>
            <Txt x={150} y={180} anchor="middle" size={9} color="var(--v-soft)">
              високо налягане
            </Txt>

            {/* Инжектор */}
            <rect x={212} y={94} width={56} height={52} rx={8} fill="var(--surface)" stroke="var(--v-ink)" strokeWidth={2} />
            <circle cx={240} cy={120} r={13} fill="none" stroke="var(--v-ink)" strokeWidth={2} />
            <path d="M240 107 V133 M227 120 H253" stroke="var(--v-ink)" strokeWidth={1.5} opacity={0.5} />
            <g opacity={started && time < 0.35 ? 1 : 0.0} style={{ transition: 'opacity 0.3s' }}>
              <path d="M240 78 q-7 12 0 18 q7 -6 0 -18z" fill="var(--v-hba1c)" />
            </g>
            <Txt x={240} y={166} anchor="middle" size={11} weight={700}>
              Инжектор
            </Txt>
            <Txt x={240} y={180} anchor="middle" size={9} color="var(--v-soft)">
              проба (t = 0)
            </Txt>

            {/* Колона */}
            <rect x={312} y={98} width={228} height={44} rx={22} fill="var(--v-liquid)" stroke="var(--v-ink)" strokeWidth={2} />
            <g clipPath={`url(#${uid}-col)`}>
              <rect x={312} y={98} width={228} height={44} fill="var(--v-metal)" opacity={0.28} />
              {Array.from({ length: 26 }, (_, i) => (
                <circle key={i} cx={322 + (i % 13) * 17} cy={106 + Math.floor(i / 13) * 28} r={3.2} fill="var(--v-metal)" opacity={0.45} />
              ))}
              {peaks.map((p) => {
                const frac = !started ? 0 : clamp(time / p.tR, 0, 1);
                if (frac >= 1) return null;
                const x = 322 + frac * 208;
                return (
                  <ellipse
                    key={p.analyte.id}
                    cx={x}
                    cy={120 + LANES[p.analyte.id]}
                    rx={5 + frac * clamp(p.sigma * 60, 6, 30)}
                    ry={6}
                    fill={p.analyte.colorVar}
                    opacity={0.55 + 0.3 * (p.conc / 2)}
                    stroke="var(--v-ink)"
                    strokeOpacity={0.35}
                  />
                );
              })}
            </g>
            <Txt x={426} y={166} anchor="middle" size={11} weight={700}>
              Колона (стационарна фаза)
            </Txt>
            <Txt x={426} y={180} anchor="middle" size={9} color="var(--v-soft)">
              разделяне на компонентите
            </Txt>

            {/* Детектор */}
            <rect x={592} y={92} width={66} height={56} rx={9} fill="var(--v-detector)" />
            <circle cx={625} cy={120} r={17} fill="#ffffff" opacity={0.2} />
            {peaks.map((p) => (
              <circle key={p.analyte.id} cx={625} cy={120 + LANES[p.analyte.id] * 0.6} r={9} fill={p.analyte.colorVar} opacity={clamp(gauss(p, time) / (p.height || 1), 0, 1)} />
            ))}
            <line x1={600} y1={120} x2={650} y2={120} stroke="var(--v-light)" strokeWidth={1.6} className="beam" opacity={0.7} />
            <Txt x={618} y={166} anchor="middle" size={11} weight={700}>
              Детектор
            </Txt>
            <Txt x={618} y={180} anchor="middle" size={9} color="var(--v-soft)">
              напр. UV-Vis
            </Txt>
            <line x1={654} y1={148} x2={654} y2={204} stroke="var(--v-glass)" strokeWidth={3} />
            <Txt x={654} y={220} anchor="middle" size={10} color="var(--v-soft)" weight={600}>
              към отпадъка
            </Txt>

            {/* Данни */}
            <polyline points="625,92 625,70 694,70" fill="none" stroke="var(--v-soft)" strokeWidth={1.8} strokeDasharray="4 3" />
            <rect x={694} y={40} width={76} height={60} rx={7} fill="var(--surface)" stroke="var(--v-ink)" strokeWidth={2} />
            <MiniTrace peaks={peaks} ymax={ymax} time={time} x={700} y={46} w={64} h={42} />
            <Txt x={732} y={116} anchor="middle" size={11} weight={700}>
              Система
            </Txt>
            <Txt x={732} y={130} anchor="middle" size={11} weight={700}>
              за данни
            </Txt>
          </svg>
        </div>

        {/* ───── Хроматограма ───── */}
        <div className="overflow-hidden rounded-xl border border-line" style={{ background: 'var(--v-panel)' }}>
          <svg viewBox="0 0 780 300" className="viz-svg block h-auto w-full" role="img" aria-label="Хроматограма: сигнал на детектора във времето с три пика, A, B и C">
            <defs>
              <clipPath id={`${uid}-rev`}>
                <rect x={PL} y={0} width={revealW} height={300} />
              </clipPath>
            </defs>

            {/* мрежа */}
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line x1={PL} x2={PR} y1={py(f * ymax)} y2={py(f * ymax)} stroke="var(--v-grid)" strokeDasharray={f === 0 ? '' : '3 4'} />
                <Txt x={PL - 8} y={py(f * ymax) + 4} anchor="end" size={10} color="var(--v-soft)" mono>
                  {fmt(f * ymax, 0)}
                </Txt>
              </g>
            ))}
            {Array.from({ length: RUN_MIN + 1 }, (_, i) => (
              <g key={i}>
                <line x1={px(i)} x2={px(i)} y1={PB} y2={PB + 5} stroke="var(--v-soft)" />
                <Txt x={px(i)} y={PB + 19} anchor="middle" size={10.5} color="var(--v-soft)">
                  {i}
                </Txt>
              </g>
            ))}
            <line x1={PL} x2={PR} y1={PB} y2={PB} stroke="var(--v-soft)" />
            <line x1={PL} x2={PL} y1={PT} y2={PB} stroke="var(--v-soft)" />
            <Txt x={(PL + PR) / 2} y={PB + 38} anchor="middle" size={11.5} color="var(--v-soft)" weight={600}>
              време от инжектирането, min
            </Txt>
            <g transform={`rotate(-90 16 ${(PT + PB) / 2})`}>
              <Txt x={16} y={(PT + PB) / 2} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
                сигнал (усл. ед.)
              </Txt>
            </g>

            {/* мъртво време */}
            <line x1={px(DEAD_TIME)} x2={px(DEAD_TIME)} y1={PT} y2={PB} stroke="var(--v-soft)" strokeDasharray="2 4" opacity={0.7} />
            <Txt x={px(DEAD_TIME) + 4} y={PT + 10} size={9.5} color="var(--v-soft)">
              t₀ = {fmt(DEAD_TIME, 1)}
            </Txt>

            {/* прогнозен профил */}
            {showFull && <path d={fullPath} fill="none" stroke="var(--v-soft)" strokeWidth={1.6} opacity={0.4} strokeDasharray="4 3" />}

            {/* площи (разкриват се с времето) */}
            <g clipPath={`url(#${uid}-rev)`}>
              {peaks.map((p, i) => (
                <path key={p.analyte.id} d={areas[i]} fill={p.analyte.colorVar} opacity={p.analyte.id === sel ? 0.5 : 0.25} />
              ))}
              <path d={fullPath} fill="none" stroke="var(--v-ink)" strokeWidth={2.4} strokeLinejoin="round" />
            </g>

            {/* избран пик: вертикала на tR */}
            <line x1={px(selPeak.tR)} x2={px(selPeak.tR)} y1={py(selPeak.height)} y2={PB} stroke={selPeak.analyte.colorVar} strokeWidth={1.8} strokeDasharray="5 3" />
            <g transform={`translate(${px(selPeak.tR)} ${py(selPeak.height) - 10})`}>
              <rect x={-52} y={-30} width={104} height={26} rx={6} fill="var(--surface)" stroke={selPeak.analyte.colorVar} strokeWidth={1.6} />
              <Txt x={0} y={-13} anchor="middle" size={11} weight={800} mono>
                tR = {fmt(selPeak.tR, 2)} min
              </Txt>
            </g>

            {/* текущ момент */}
            {started && (
              <g>
                <line x1={px(time)} x2={px(time)} y1={PT} y2={PB} stroke="var(--accent)" strokeWidth={1.4} opacity={0.7} />
                <circle cx={px(time)} cy={py(curSignal)} r={5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
              </g>
            )}

            {/* етикети на пиковете + области за избор */}
            {peaks.map((p) => {
              const active = p.analyte.id === sel;
              const x0 = px(Math.max(0, p.tR - 4.5 * p.sigma));
              const x1 = px(Math.min(RUN_MIN, p.tR + 4.5 * p.sigma));
              return (
                <g
                  key={p.analyte.id}
                  className="viz-hit"
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  aria-label={`Избери пик ${p.analyte.id}: tR ${fmt(p.tR, 2)} min, площ ${fmt(p.area, 0)}`}
                  onClick={() => setSel(p.analyte.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSel(p.analyte.id);
                    }
                  }}
                >
                  <rect x={x0} y={PT} width={Math.max(14, x1 - x0)} height={PB - PT} fill="transparent" />
                  <g transform={`translate(${px(p.tR)} ${py(p.height) - 44 < PT + 4 ? py(p.height) + 16 : py(p.height) - 44})`} opacity={time >= p.tR || !started ? 1 : 0.55}>
                    <circle r={11} fill={p.analyte.colorVar} stroke={active ? 'var(--accent)' : 'var(--surface)'} strokeWidth={active ? 3 : 2} />
                    <Txt x={0} y={4} anchor="middle" size={11.5} weight={800} color="#ffffff">
                      {p.analyte.id}
                    </Txt>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {/* ───── Управление на пробега ───── */}
        <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            {clock.playing ? (
              <IconButton icon="pause" label="Пауза" onClick={clock.pause} primary showLabel />
            ) : (
              <IconButton icon="play" label={finished ? 'Пусни отново' : started ? 'Продължи' : 'Пусни пробега'} onClick={clock.play} primary showLabel />
            )}
            <IconButton icon="restart" label="Рестарт" onClick={clock.restart} showLabel />
            <span className="mx-1 hidden h-6 w-px bg-line sm:block" />
            <Segmented<'0.5' | '1' | '2'>
              label="Скорост на симулацията"
              size="sm"
              value={String(clock.speed) as '0.5' | '1' | '2'}
              onChange={(v) => clock.setSpeed(Number(v))}
              options={[
                { value: '0.5', label: '0,5×' },
                { value: '1', label: '1×' },
                { value: '2', label: '2×' },
              ]}
            />
            <span className="ml-auto text-sm font-semibold text-muted tabular-nums" aria-live="off">
              t = {fmt(time, 2)} / {RUN_MIN} min
            </span>
          </div>
          <Slider
            id={`${uid}-time`}
            label="Преглед по време (плъзни за преместване)"
            value={Number(time.toFixed(2))}
            min={0}
            max={RUN_MIN}
            step={0.05}
            display={`${fmt(time, 2)} min`}
            onChange={(v) => {
              clock.pause();
              clock.seek(v);
            }}
          />
        </div>

        {/* ───── Избран пик ───── */}
        <ExplainPanel eyebrow={`Избран пик – ${selPeak.analyte.name}`} title={`tR = ${fmt(selPeak.tR, 2)} min · площ = ${fmt(selPeak.area, 0)} усл. ед.`}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ValuePill label="Време на задържане tR" value={fmt(selPeak.tR, 2)} unit="min" kind="measured" />
            <ValuePill label="Площ на пика" value={fmt(selPeak.area, 0)} unit="усл. ед." kind="measured" />
            <ValuePill label="Височина" value={fmt(selPeak.height, 0)} unit="усл. ед." kind="measured" />
            <ValuePill label="Фактор k = (tR − t₀)/t₀" value={fmt(selPeak.k, 2)} kind="calculated" />
          </div>
          <p className="!m-0 pt-1">
            <strong>tR</strong> казва <em>кое</em> е веществото (при тези условия), а <strong>площта</strong> – <em>колко</em> от него има. Промени концентрацията на {selPeak.analyte.id}: площта се променя
            ({fmt(selBase.area, 0)} → {fmt(selPeak.area, 0)}), а tR остава {fmt(selPeak.tR, 2)} min. Промени състава на подвижната фаза: tR се мести, а площта – не.
          </p>
          <p className="!m-0 text-sm text-muted">
            {rsPrev !== undefined && (
              <>
                Разделителна способност спрямо предходния пик: <strong className="text-ink">Rs = {fmt(rsPrev, 2)}</strong> ({rsText(rsPrev)}).{' '}
              </>
            )}
            {rsNext !== undefined && (
              <>
                Спрямо следващия пик: <strong className="text-ink">Rs = {fmt(rsNext, 2)}</strong> ({rsText(rsNext)}).
              </>
            )}
          </p>
        </ExplainPanel>

        {/* ───── Параметри ───── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
            <p className="!m-0 text-sm font-bold text-ink">Концентрация на компонентите (относителна)</p>
            {ANALYTES.map((a) => (
              <Slider
                key={a.id}
                id={`${uid}-c${a.id}`}
                label={`${a.name}`}
                value={conc[a.id]}
                min={0.2}
                max={2}
                step={0.05}
                display={`${fmt(conc[a.id], 2)}×`}
                onChange={(v) => {
                  setConc((c) => ({ ...c, [a.id]: v }));
                  setSel(a.id);
                }}
              />
            ))}
          </div>
          <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
            <p className="!m-0 text-sm font-bold text-ink">Условия на разделяне</p>
            <Slider
              id={`${uid}-org`}
              label="Дял органичен разтворител в подвижната фаза"
              value={organic}
              min={30}
              max={50}
              step={1}
              display={`${fmt(organic, 0)} %`}
              hint="Повече органичен разтворител (обратнофазова хроматография) → по-силно елуиране → по-къси времена на задържане."
              onChange={setOrganic}
            />
            <Slider
              id={`${uid}-n`}
              label="Ефективност на колоната (теоретични плочи N)"
              value={plates}
              min={80}
              max={1500}
              step={20}
              display={String(plates)}
              hint="По-ниска ефективност → по-широки пикове → по-лошо разделяне."
              onChange={setPlates}
            />
            <Toggle id={`${uid}-full`} label="Покажи очаквания профил (бледо)" checked={showFull} onChange={setShowFull} />
          </div>
        </div>

        {/* ───── Сравнение с базовите условия ───── */}
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <caption className="px-4 pt-3 text-left text-sm font-bold text-ink">Резултати за трите компонента (спрямо базовите условия)</caption>
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2 font-semibold">Компонент</th>
                <th className="px-4 py-2 font-semibold">tR, min (базово)</th>
                <th className="px-4 py-2 font-semibold">Площ (базово)</th>
                <th className="px-4 py-2 font-semibold">Rs към следващия</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {peaks.map((p, i) => {
                const b = base[i];
                const tChanged = Math.abs(p.tR - b.tR) > 0.005;
                const aChanged = Math.abs(p.area - b.area) > 0.5;
                const rs = i < peaks.length - 1 ? resolution(p, peaks[i + 1]) : undefined;
                return (
                  <tr key={p.analyte.id} className={`border-b border-line/60 last:border-0 ${p.analyte.id === sel ? 'bg-accent-soft/60' : ''}`}>
                    <th scope="row" className="px-4 py-2 font-semibold text-ink">
                      <span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: p.analyte.colorVar }} />
                      {p.analyte.name}
                    </th>
                    <td className={`px-4 py-2 ${tChanged ? 'font-bold text-accent' : ''}`}>
                      {fmt(p.tR, 2)} <span className="text-muted">({fmt(b.tR, 2)})</span>
                    </td>
                    <td className={`px-4 py-2 ${aChanged ? 'font-bold text-accent' : ''}`}>
                      {fmt(p.area, 0)} <span className="text-muted">({fmt(b.area, 0)})</span>
                    </td>
                    <td className="px-4 py-2">{rs !== undefined ? `${fmt(rs, 2)} – ${rsText(rs)}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </VizFrame>
  );
}

/* ───────── Мини-хроматограма в „системата за данни“ ───────── */
function MiniTrace({ peaks, ymax, time, x, y, w, h }: { peaks: PeakModel[]; ymax: number; time: number; x: number; y: number; w: number; h: number }) {
  const n = 120;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i * RUN_MIN) / (n - 1);
    if (t > time) break;
    const s = signalAt(peaks, t);
    pts.push(`${(x + (t / RUN_MIN) * w).toFixed(1)},${(y + h - (s / ymax) * h).toFixed(1)}`);
  }
  return (
    <g>
      <line x1={x} x2={x + w} y1={y + h} y2={y + h} stroke="var(--v-soft)" strokeWidth={1} />
      {pts.length > 1 && <polyline points={pts.join(' ')} fill="none" stroke="var(--accent)" strokeWidth={1.6} />}
    </g>
  );
}
