import { Icon } from '../ui/Icon';
import { RichText } from '../ui/RichText';
import { references as allRefs } from '../../data/references';
import type { ComponentGroup, ProcessStep, Reference, Term } from '../../types';

/* ───────── Необходими компоненти ───────── */
export function ComponentsGrid({ groups }: { groups: ComponentGroup[] }) {
  return (
    <div className="my-4 grid gap-4 md:grid-cols-2">
      {groups.map((g) => (
        <div key={g.title} className="rounded-xl border border-line bg-surface p-4">
          <div className="mb-2 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Icon name={g.icon} size={18} />
            </span>
            <h3 className="!m-0 text-base font-bold text-ink">{g.title}</h3>
          </div>
          <ul className="!my-0 !list-none space-y-2 !pl-0">
            {g.items.map((it) => (
              <li key={it.name} className="!m-0 !p-0 text-[0.92rem] leading-relaxed">
                <span className="font-semibold text-ink">{it.name}</span>
                <span className="text-muted"> – </span>
                <span className="text-muted">
                  <RichText text={it.text} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ───────── Процес на измерване (вертикална времева линия) ───────── */
export function ProcessList({ steps }: { steps: ProcessStep[] }) {
  return (
    <ol className="!my-4 !list-none !p-0">
      {steps.map((s, i) => (
        <li key={s.title} className="!m-0 flex gap-4 !p-0">
          <div className="flex flex-col items-center">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-ink">
              {i + 1}
            </span>
            {i < steps.length - 1 && <span className="my-1 w-px flex-1 bg-line" />}
          </div>
          <div className="pb-5">
            <h3 className="!m-0 text-[1.02rem] font-bold text-ink">{s.title}</h3>
            <p className="!m-0 !mt-1 text-[0.95rem] text-muted">
              <RichText text={s.text} />
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ───────── Предимства и ограничения ───────── */
export function ProsCons({ pros, cons }: { pros: string[]; cons: string[] }) {
  return (
    <div className="my-4 grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-ok/35 bg-ok/8 p-4">
        <h3 className="!m-0 mb-2 flex items-center gap-2 text-base font-bold text-ink">
          <Icon name="check" size={18} className="text-ok" /> Предимства
        </h3>
        <ul className="!my-0 !list-none !pl-0">
          {pros.map((p) => (
            <li key={p} className="!my-1.5 flex gap-2 !pl-0 text-[0.93rem]">
              <Icon name="check" size={16} className="mt-1 shrink-0 text-ok" />
              <span>
                <RichText text={p} />
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-warn/35 bg-warn/8 p-4">
        <h3 className="!m-0 mb-2 flex items-center gap-2 text-base font-bold text-ink">
          <Icon name="alert" size={18} className="text-warn" /> Ограничения
        </h3>
        <ul className="!my-0 !list-none !pl-0">
          {cons.map((c) => (
            <li key={c} className="!my-1.5 flex gap-2 !pl-0 text-[0.93rem]">
              <Icon name="alert" size={16} className="mt-1 shrink-0 text-warn" />
              <span>
                <RichText text={c} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ───────── Важно за изпита ───────── */
export function ExamBox({ items }: { items: string[] }) {
  return (
    <div className="my-4 rounded-2xl border border-accent/40 bg-gradient-to-br from-accent-soft to-surface p-5">
      <p className="eyebrow !m-0 flex items-center gap-1.5">
        <Icon name="graduation" size={15} /> Кратко резюме
      </p>
      <ol className="!mb-0 !mt-3 !list-none !p-0">
        {items.map((it, i) => (
          <li key={i} className="!m-0 flex gap-3 !p-0 py-1.5 text-[0.95rem]">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-bold" style={{ color: 'var(--surface)' }}>
              {i + 1}
            </span>
            <span>
              <RichText text={it} />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ───────── Терминология ───────── */
export function Glossary({ terms }: { terms: Term[] }) {
  return (
    <dl className="my-4 grid gap-3 md:grid-cols-2">
      {terms.map((t) => (
        <div key={t.term} className="rounded-xl border border-line bg-surface p-3.5">
          <dt className="text-[0.97rem] font-bold text-ink">
            {t.term}
            {t.latin && <span className="ml-2 break-words text-sm font-medium text-accent [overflow-wrap:anywhere]">{t.latin}</span>}
          </dt>
          <dd className="!m-0 mt-1 text-[0.9rem] leading-relaxed text-muted">
            <RichText text={t.def} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ───────── Източници ───────── */
const kindLabel: Record<Reference['kind'], string> = {
  textbook: 'Учебник',
  article: 'Статия',
  standard: 'Стандарт',
  guideline: 'Насоки',
  manufacturer: 'Производител',
  laboratory: 'Лаборатория',
};

export function References({ ids }: { ids: string[] }) {
  const refs = ids.map((id) => allRefs.find((r) => r.id === id)).filter((r): r is Reference => Boolean(r));
  return (
    <div>
      <ol className="!my-3 !list-none space-y-2.5 !p-0">
        {refs.map((r, i) => (
          <li key={r.id} className="!m-0 flex gap-3 rounded-xl border border-line bg-surface p-3.5 !pl-3.5">
            <span className="mt-0.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-surface2 text-xs font-bold text-muted">
              {i + 1}
            </span>
            <div className="min-w-0 text-[0.9rem] leading-relaxed">
              <span className="mr-2 rounded bg-accent-soft px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-accent">
                {kindLabel[r.kind]}
              </span>
              <span className="text-ink">{r.citation}</span>
              {r.note && <p className="!m-0 mt-1 text-xs text-muted">{r.note}</p>}
            </div>
          </li>
        ))}
      </ol>
      <p className="rounded-lg bg-surface2 p-3 text-xs leading-relaxed text-muted">
        <Icon name="info" size={13} className="mr-1 inline -translate-y-px" />
        Изброените източници са общопризнати учебници, стандарти и публикации по темата. Конкретните параметри на реактиви и анализатори
        (дължини на вълната, състав на реактивите, интервали за приемливост) се определят от производителя – задължителен източник е
        листовката на използвания реактив и ръководството на апарата. Източници, които не са проверени за конкретен факт, не са приписвани
        на него.
      </p>
    </div>
  );
}
