import { useId, useState } from 'react';
import { VizFrame, ExplainPanel, ValuePill } from '../ui/VizFrame';
import { Slider } from '../ui/Controls';
import { Callout } from '../ui/Callout';
import { Jig, Txt, Arrow } from './shared';
import { fmt, mulberry32 } from '../../lib/stats';

/* Илюстративни допускания:
   – натрият във ВОДНАТА фаза на плазмата е постоянен (C_W);
   – нормалният воден дял е 0,93 (твърда фаза 0,07);
   – индиректният метод разрежда пробата и приема нормален воден дял при преизчисляването. */
const C_W = 150; // mmol на литър плазмена вода (илюстративно)
const W_NORMAL = 0.93;

const rng = mulberry32(31);
const pool = (n: number, x0: number, x1: number, y0: number, y1: number): [number, number][] =>
  Array.from({ length: n }, () => [x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0)]);

const TUBE = { x: 58, y: 64, w: 96, h: 190 };
const ION_T = pool(30, TUBE.x + 8, TUBE.x + TUBE.w - 8, TUBE.y + 10, TUBE.y + TUBE.h - 12);
const SOL_T = pool(44, TUBE.x + 9, TUBE.x + TUBE.w - 9, TUBE.y + 10, TUBE.y + TUBE.h - 12);

const CELL_D = { x: 214, y: 70, w: 118, h: 64 };
const ION_D = pool(16, CELL_D.x + 8, CELL_D.x + CELL_D.w - 8, CELL_D.y + 22, CELL_D.y + CELL_D.h - 8);
const SOL_D = pool(22, CELL_D.x + 8, CELL_D.x + CELL_D.w - 8, CELL_D.y + 22, CELL_D.y + CELL_D.h - 8);

const CELL_I = { x: 214, y: 218, w: 118, h: 80 };
const ION_I = pool(16, CELL_I.x + 8, CELL_I.x + CELL_I.w - 8, CELL_I.y + 26, CELL_I.y + CELL_I.h - 8);
const SOL_I = pool(22, CELL_I.x + 8, CELL_I.x + CELL_I.w - 8, CELL_I.y + 26, CELL_I.y + CELL_I.h - 8);

export function DirectVsIndirectDiagram() {
  const uid = useId().replace(/:/g, '');
  const [solids, setSolids] = useState(0.07);

  const water = 1 - solids;
  const direct = C_W * W_NORMAL; // директният ISE отчита активността във водната фаза → практически постоянен
  const indirect = C_W * water; // индиректният „вижда“ натрия на литър цяла плазма
  const diff = indirect - direct;
  const nIons = Math.round(30 * (water / W_NORMAL) * 0.93);
  const nSol = Math.round(solids * 44 / 0.2);

  const bx = (v: number) => 410 + ((v - 100) / 60) * 300;
  const state = solids > 0.095 ? 'high' : solids < 0.05 ? 'low' : 'normal';

  return (
    <VizFrame
      title="Директен и индиректен ISE – влияние на твърдата фаза на плазмата"
      subtitle="Плъзни дела на твърдата фаза (липиди и протеини) и сравни какво отчита всеки метод."
      icon="compare"
      note="Схематична образователна илюстрация със стойности, зададени за обучение. Натрият във водната фаза е приет за постоянен; величините на отклоненията при реални анализатори зависят от метода и пробата."
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-line" style={{ background: 'var(--v-panel)' }}>
          <svg viewBox="0 0 780 330" className="viz-svg block h-auto w-full" role="img" aria-label="Сравнение на директен и индиректен йонселективен електрод при различен дял на твърдата фаза">
            <defs>
              <clipPath id={`${uid}-tube`}>
                <rect x={TUBE.x + 3} y={TUBE.y + 3} width={TUBE.w - 6} height={TUBE.h - 6} rx={8} />
              </clipPath>
            </defs>

            {/* Плазма */}
            <Txt x={TUBE.x + TUBE.w / 2} y={36} anchor="middle" size={13} weight={800}>
              Плазма
            </Txt>
            <Txt x={TUBE.x + TUBE.w / 2} y={52} anchor="middle" size={10} color="var(--v-soft)">
              твърда фаза: {fmt(solids * 100, 0)} %
            </Txt>
            <rect x={TUBE.x} y={TUBE.y} width={TUBE.w} height={TUBE.h} rx={10} fill="var(--v-liquid)" />
            <g clipPath={`url(#${uid}-tube)`}>
              {SOL_T.slice(0, nSol).map((p, i) => (
                <Jig key={`s${i}`} x={p[0]} y={p[1]} delay={i * 0.21}>
                  <circle r={5} fill="var(--v-hapten)" opacity={0.55} stroke="var(--v-ink)" strokeOpacity={0.25} strokeWidth={0.7} />
                </Jig>
              ))}
              {ION_T.slice(0, nIons).map((p, i) => (
                <Jig key={`i${i}`} x={p[0] + 3} y={p[1] + 3} delay={i * 0.15}>
                  <circle r={3.8} fill="var(--v-na)" />
                </Jig>
              ))}
            </g>
            <rect x={TUBE.x} y={TUBE.y} width={TUBE.w} height={TUBE.h} rx={10} fill="none" stroke="var(--v-glass)" strokeWidth={2.5} />
            <Txt x={TUBE.x + TUBE.w / 2} y={TUBE.y + TUBE.h + 18} anchor="middle" size={11} color="var(--v-soft)">
              водна фаза: {fmt(water * 100, 0)} %
            </Txt>

            <Arrow x1={162} y1={120} x2={206} y2={104} />
            <Arrow x1={162} y1={200} x2={206} y2={246} />

            {/* ───── Директен ISE ───── */}
            <Txt x={214} y={36} size={13} weight={800}>
              Директен ISE
            </Txt>
            <Txt x={214} y={52} size={10} color="var(--v-soft)">
              неразредена проба
            </Txt>
            <rect x={CELL_D.x} y={CELL_D.y} width={CELL_D.w} height={CELL_D.h} rx={8} fill="var(--v-liquid)" />
            {SOL_D.slice(0, Math.round((nSol * 22) / 44)).map((p, i) => (
              <Jig key={`ds${i}`} x={p[0]} y={p[1]} delay={i * 0.21}>
                <circle r={4} fill="var(--v-hapten)" opacity={0.55} />
              </Jig>
            ))}
            {ION_D.slice(0, Math.round((nIons / 30) * 16)).map((p, i) => (
              <Jig key={`di${i}`} x={p[0]} y={p[1]} delay={i * 0.17}>
                <circle r={3.4} fill="var(--v-na)" />
              </Jig>
            ))}
            <rect x={CELL_D.x} y={CELL_D.y} width={CELL_D.w} height={CELL_D.h} rx={8} fill="none" stroke="var(--v-glass)" strokeWidth={2.5} />
            <rect x={CELL_D.x + CELL_D.w / 2 - 6} y={CELL_D.y - 10} width={12} height={42} rx={3} fill="var(--v-metal)" stroke="var(--v-ink)" strokeOpacity={0.4} />
            <rect x={CELL_D.x + CELL_D.w / 2 - 6} y={CELL_D.y + 22} width={12} height={10} rx={3} fill="var(--v-na)" />
            <Txt x={CELL_D.x + CELL_D.w + 8} y={CELL_D.y + 4} size={10} color="var(--v-soft)" weight={600}>
              Na⁺ ISE
            </Txt>
            <Txt x={CELL_D.x} y={CELL_D.y + CELL_D.h + 16} size={10.5} color="var(--v-soft)">
              измерва активността във водната фаза
            </Txt>

            {/* Резултат – директен */}
            <Txt x={410} y={36} size={11} color="var(--v-soft)" weight={700}>
              ПОКАЗАНИЕ (Na⁺, mmol/L)
            </Txt>
            <rect x={410} y={74} width={300} height={22} rx={5} fill="var(--v-grid)" opacity={0.6} />
            <rect x={410} y={74} width={bx(direct) - 410} height={22} rx={5} fill="var(--v-antibody)" />
            <Txt x={bx(direct) + 6} y={90} size={13} weight={800} mono>
              {fmt(direct, 1)}
            </Txt>
            <Txt x={410} y={118} size={10.5} color="var(--v-soft)">
              почти не зависи от дела на твърдата фаза
            </Txt>

            {/* ───── Индиректен ISE ───── */}
            <Txt x={214} y={196} size={13} weight={800}>
              Индиректен ISE
            </Txt>
            <Txt x={214} y={211} size={10} color="var(--v-soft)">
              проба + разредител
            </Txt>
            <rect x={CELL_I.x} y={CELL_I.y} width={CELL_I.w} height={CELL_I.h} rx={8} fill="var(--v-liquid)" />
            <rect x={CELL_I.x} y={CELL_I.y} width={CELL_I.w} height={CELL_I.h} rx={8} fill="var(--v-dye-free)" opacity={0.1} />
            {SOL_I.slice(0, Math.max(1, Math.round((nSol * 22) / 44 / 3))).map((p, i) => (
              <Jig key={`is${i}`} x={p[0]} y={p[1]} delay={i * 0.21}>
                <circle r={3.4} fill="var(--v-hapten)" opacity={0.5} />
              </Jig>
            ))}
            {ION_I.slice(0, Math.max(1, Math.round((nIons / 30) * 16 / 3))).map((p, i) => (
              <Jig key={`ii${i}`} x={p[0]} y={p[1]} delay={i * 0.17}>
                <circle r={3.2} fill="var(--v-na)" />
              </Jig>
            ))}
            <rect x={CELL_I.x} y={CELL_I.y} width={CELL_I.w} height={CELL_I.h} rx={8} fill="none" stroke="var(--v-glass)" strokeWidth={2.5} />
            <rect x={CELL_I.x + CELL_I.w / 2 - 6} y={CELL_I.y - 4} width={12} height={50} rx={3} fill="var(--v-metal)" stroke="var(--v-ink)" strokeOpacity={0.4} />
            <rect x={CELL_I.x + CELL_I.w / 2 - 6} y={CELL_I.y + 36} width={12} height={10} rx={3} fill="var(--v-na)" />
            <Txt x={CELL_I.x + CELL_I.w + 8} y={CELL_I.y + 4} size={10} color="var(--v-soft)" weight={600}>
              Na⁺ ISE
            </Txt>
            <Txt x={CELL_I.x} y={CELL_I.y + CELL_I.h + 16} size={10.5} color="var(--v-soft)">
              разредено → резултатът се преизчислява
            </Txt>

            <Txt x={410} y={196} size={11} color="var(--v-soft)" weight={700}>
              ПОКАЗАНИЕ (Na⁺, mmol/L)
            </Txt>
            <rect x={410} y={232} width={300} height={22} rx={5} fill="var(--v-grid)" opacity={0.6} />
            <rect x={410} y={232} width={bx(indirect) - 410} height={22} rx={5} fill={state === 'normal' ? 'var(--v-antibody)' : 'var(--v-blood)'} />
            <Txt x={bx(indirect) + 6} y={248} size={13} weight={800} mono>
              {fmt(indirect, 1)}
            </Txt>
            <Txt x={410} y={276} size={10.5} color="var(--v-soft)">
              приема нормален воден дял (≈ {fmt(W_NORMAL * 100, 0)} %)
            </Txt>

            {/* Скала и реперна линия */}
            <line x1={bx(direct)} x2={bx(direct)} y1={66} y2={262} stroke="var(--v-ink)" strokeDasharray="4 4" opacity={0.5} />
            {[100, 120, 140, 160].map((v) => (
              <Txt key={v} x={bx(v)} y={304} anchor="middle" size={10} color="var(--v-soft)">
                {v}
              </Txt>
            ))}
            <line x1={bx(100)} x2={bx(160)} y1={290} y2={290} stroke="var(--v-soft)" />
          </svg>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <Slider
            id={`${uid}-solids`}
            label="Дял на твърдата фаза в плазмата (липиди + протеини)"
            value={solids}
            min={0.04}
            max={0.2}
            step={0.005}
            display={`${fmt(solids * 100, 1)} %`}
            hint="Нормално около 7 % (≈ 93 % вода). Силно повишени липиди или протеини увеличават твърдата фаза."
            onChange={setSolids}
          />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ValuePill label="Воден дял" value={fmt(water * 100, 1)} unit="%" kind="neutral" />
            <ValuePill label="Директен ISE" value={fmt(direct, 1)} unit="mmol/L" kind="measured" />
            <ValuePill label="Индиректен ISE" value={fmt(indirect, 1)} unit="mmol/L" kind="measured" />
            <ValuePill label="Разлика (индир. − дир.)" value={`${diff > 0.05 ? '+' : ''}${fmt(diff, 1)}`} unit="mmol/L" kind="calculated" />
          </div>
        </div>

        <ExplainPanel
          eyebrow="Какво виждаш"
          title={state === 'high' ? 'Много твърда фаза: индиректният метод отчита по-ниско' : state === 'low' ? 'Малко твърда фаза: индиректният метод отчита по-високо' : 'Нормален воден дял: двата метода съвпадат'}
        >
          {state === 'normal' && (
            <p className="!m-0">
              При нормален дял на твърдата фаза и двата метода дават практически един и същ резултат – индиректният метод разчита именно на този нормален воден дял.
            </p>
          )}
          {state === 'high' && (
            <p className="!m-0">
              Липидите и протеините <strong>заемат обем</strong>, без да съдържат натрий. На литър плазма има по-малко вода, а оттам – по-малко Na⁺. Индиректният метод разрежда пробата и „вижда“ по-малко натрий, затова дава <strong>фалшиво понижен</strong> резултат (псевдохипонатриемия). Директният ISE измерва активността във водната фаза и остава почти непроменен.
            </p>
          )}
          {state === 'low' && (
            <p className="!m-0">
              При необичайно малък дял твърда фаза литърът плазма съдържа повече вода и натрий. Индиректният метод, който преизчислява при нормален воден дял, може да отчете <strong>леко повишен</strong> резултат, докато директният остава практически непроменен.
            </p>
          )}
        </ExplainPanel>

        <Callout
          tone="verify"
          title="Важно"
          text="Тази илюстрация показва **принципа**. Големината на отклонението при реални анализатори зависи от метода, разреждането и конкретната проба – не се използва за корекция на резултати на пациенти."
        />
      </div>
    </VizFrame>
  );
}
