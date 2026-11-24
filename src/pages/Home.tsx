import { Icon } from '../components/ui/Icon';
import { TopicCard } from '../components/education/TopicCard';
import { learnPillars, topics } from '../data/topics';

/** Малка анимирана хроматограма като научен мотив в началния екран (SVG, без външни ресурси). */
function HeroMotif() {
  const peaks = [
    { x: 70, h: 38, w: 9 },
    { x: 140, h: 70, w: 11 },
    { x: 225, h: 48, w: 14 },
  ];
  const path = (() => {
    let d = 'M0 100';
    for (let x = 0; x <= 300; x += 3) {
      let y = 100;
      for (const p of peaks) y -= p.h * Math.exp(-((x - p.x) ** 2) / (2 * p.w * p.w));
      d += ` L${x} ${y.toFixed(1)}`;
    }
    return d;
  })();
  return (
    <svg viewBox="0 0 300 120" className="viz-svg w-full max-w-sm" role="img" aria-label="Схематична хроматограма с три пика">
      <g stroke="var(--v-grid)" strokeWidth="1">
        {[20, 45, 70, 95].map((y) => (
          <line key={y} x1="0" x2="300" y1={y} y2={y} />
        ))}
      </g>
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
      {peaks.map((p, i) => (
        <g key={i}>
          <line x1={p.x} x2={p.x} y1={100 - p.h - 4} y2="104" stroke="var(--v-soft)" strokeDasharray="3 3" />
          <text x={p.x} y="116" textAnchor="middle" fontSize="9" fontWeight="600">
            {['A', 'B', 'C'][i]}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function Home() {
  return (
    <div className="fade-up space-y-10">
      <section className="card relative overflow-hidden p-6 sm:p-10">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom_left,black,transparent_70%)]" aria-hidden />
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-teal-400/25 to-cyan-400/10 blur-3xl" aria-hidden />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="eyebrow !m-0 flex items-center gap-2">
              <Icon name="flask" size={15} /> Образователна платформа
            </p>
            <h1 className="!mb-3 !mt-2 max-w-3xl text-[2rem] font-extrabold leading-tight text-ink sm:text-[2.6rem]">
              Клинична лаборатория – Интерактивно обучение
            </h1>
            <p className="!m-0 max-w-2xl text-[1.08rem] leading-relaxed text-muted">
              Разбиране на лабораторните методи чрез наука, визуализация и интерактивно обучение.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#/metodi" className="btn btn-primary">
                <Icon name="beaker" size={18} /> Аналитични методи
              </a>
              <a href="#/kachestven-kontrol" className="btn">
                <Icon name="shieldCheck" size={18} /> Качествен контрол
              </a>
            </div>
          </div>
          <div className="hidden lg:block">
            <HeroMotif />
          </div>
        </div>
      </section>

      <section aria-labelledby="modules-h">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow !m-0">Осем урока</p>
            <h2 id="modules-h" className="!m-0 text-[1.5rem] font-extrabold text-ink">
              Учебни модули
            </h2>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {topics.map((t, i) => (
            <TopicCard key={t.id} topic={t} index={i + 1} />
          ))}
        </div>
      </section>

      <section aria-labelledby="learn-h" className="card p-6 sm:p-8">
        <p className="eyebrow !m-0">Подход</p>
        <h2 id="learn-h" className="!mb-2 !mt-1 text-[1.5rem] font-extrabold text-ink">
          Какво ще научиш
        </h2>
        <p className="!mt-0 max-w-3xl text-[1rem] leading-relaxed text-muted">
          Платформата не е сборник от наизустяване на стъпки. Целта е да разбереш <strong className="text-ink">научните принципи зад лабораторните измервания</strong> –
          какво физично или химично явление се случва в пробата, как то се превръща в измерим сигнал и как този сигнал става надежден
          резултат. Всеки урок следва една и съща структура, а диаграмите можеш да управляваш стъпка по стъпка.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {learnPillars.map((p) => (
            <div key={p.title} className="rounded-xl border border-line bg-surface2/50 p-4">
              <span className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Icon name={p.icon} size={21} />
              </span>
              <h3 className="!m-0 text-base font-bold text-ink">{p.title}</h3>
              <p className="!mb-0 !mt-1.5 text-[0.9rem] leading-relaxed text-muted">{p.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
