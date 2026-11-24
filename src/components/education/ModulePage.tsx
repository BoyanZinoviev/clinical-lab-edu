import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../ui/Icon';
import { Link } from '../ui/Link';
import { BlockRenderer } from './BlockRenderer';
import { ComponentsGrid, ExamBox, Glossary, ProcessList, ProsCons, References } from './Parts';
import { RichText } from '../ui/RichText';
import { sections, topics } from '../../data/topics';
import { scrollToSection, sectionElementId } from '../../lib/router';
import type { ModuleContent, Topic } from '../../types';

function SectionShell({
  id,
  index,
  title,
  children,
}: {
  id: string;
  index: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={sectionElementId(id)} aria-labelledby={`h-${id}`} className="scroll-mt-24 border-t border-line py-8 first:border-t-0 first:pt-2">
      <h2 id={`h-${id}`} className="!mb-3 flex items-center gap-3 text-[1.45rem] font-extrabold text-ink">
        <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-brand px-2 text-sm font-bold text-brand-ink">{index}</span>
        {title}
      </h2>
      <div className="edu">{children}</div>
    </section>
  );
}

function TableOfContents({ topic, active }: { topic: Topic; active: string }) {
  return (
    <nav aria-label="Съдържание на урока">
      <p className="eyebrow !mb-2">На тази страница</p>
      <ol className="space-y-0.5 border-l border-line">
        {sections.map((s, i) => (
          <li key={s.id}>
            <a
              href={`#${topic.path}?s=${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection(s.id);
              }}
              aria-current={active === s.id ? 'location' : undefined}
              className={`-ml-px block border-l-2 py-1.5 pl-3 pr-2 text-[0.85rem] leading-snug transition-colors ${
                active === s.id
                  ? 'border-accent font-bold text-ink'
                  : 'border-transparent font-medium text-muted hover:border-line hover:text-ink'
              }`}
            >
              <span className="mr-1.5 tabular-nums opacity-60">{i + 1}.</span>
              {s.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ModulePage({
  topic,
  content,
  visualization,
}: {
  topic: Topic;
  content: ModuleContent;
  visualization: ReactNode;
}) {
  const [active, setActive] = useState<string>(sections[0].id);

  // Подчертава текущия раздел в съдържанието.
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(sectionElementId(s.id))).filter((e): e is HTMLElement => Boolean(e));
    if (!('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id.replace('sec-', ''));
      },
      { rootMargin: '-90px 0px -65% 0px', threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [topic.id]);

  const idx = topics.findIndex((t) => t.id === topic.id);
  const prev = idx > 0 ? topics[idx - 1] : undefined;
  const next = idx < topics.length - 1 ? topics[idx + 1] : undefined;

  return (
    <article className="fade-up">
      <header className="card relative mb-6 overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-teal-400/20 to-cyan-400/10 blur-2xl" aria-hidden />
        <div className="relative flex items-start gap-4">
          <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-ink sm:flex">
            <Icon name={topic.icon} size={28} />
          </span>
          <div className="min-w-0">
            <p className="eyebrow !m-0">{topic.category}</p>
            <h1 className="!mb-2 !mt-1 text-[1.65rem] font-extrabold leading-tight text-ink sm:text-[2rem]">{topic.title}</h1>
            <p className="!m-0 max-w-3xl text-[1rem] text-muted">
              <RichText text={topic.description} />
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="chip"><Icon name="activity" size={13} /> Интерактивна визуализация</span>
              <span className="chip"><Icon name="graduation" size={13} /> Образователен материал</span>
            </div>
          </div>
        </div>
      </header>

      {/* Мобилно/планшетно съдържание – хоризонтален списък */}
      <nav aria-label="Раздели на урока" className="no-print -mx-3 mb-4 overflow-x-auto px-3 sm:mx-0 sm:px-0 xl:hidden">
        <ol className="flex w-max gap-2 pb-1">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${topic.path}?s=${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(s.id);
                }}
                className={`block whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active === s.id ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-surface text-muted hover:text-ink'
                }`}
              >
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_14.5rem] xl:gap-10">
        <div className="min-w-0">
          <SectionShell id="vavedenie" index={1} title="Въведение">
            <BlockRenderer blocks={content.intro} />
          </SectionShell>

          <SectionShell id="printsip" index={2} title="Принцип на метода">
            <BlockRenderer blocks={content.principle} />
          </SectionShell>

          <SectionShell id="komponenti" index={3} title="Необходими компоненти">
            <ComponentsGrid groups={content.components} />
          </SectionShell>

          <SectionShell id="vizualizaciya" index={4} title="Графична визуализация">
            <BlockRenderer blocks={content.vizIntro} />
            {visualization}
          </SectionShell>

          <SectionShell id="proces" index={5} title="Процес на измерване">
            <ProcessList steps={content.process} />
            {content.processNotes && <BlockRenderer blocks={content.processNotes} />}
          </SectionShell>

          <SectionShell id="interpretaciya" index={6} title="Интерпретация на резултатите">
            <BlockRenderer blocks={content.interpretation} />
          </SectionShell>

          <SectionShell id="predimstva" index={7} title="Предимства и ограничения">
            <ProsCons pros={content.pros} cons={content.cons} />
            {content.prosConsNotes && <BlockRenderer blocks={content.prosConsNotes} />}
          </SectionShell>

          <SectionShell id="izpit" index={8} title="Важно за изпита">
            <ExamBox items={content.exam} />
          </SectionShell>

          <SectionShell id="terminologiya" index={9} title="Терминология">
            <Glossary terms={content.terms} />
          </SectionShell>

          <SectionShell id="iztochnici" index={10} title="Източници">
            <References ids={content.references} />
          </SectionShell>

          <nav aria-label="Предишен и следващ урок" className="no-print mt-4 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
            {prev ? (
              <Link to={prev.path} className="card flex items-center gap-3 p-4 transition-colors hover:border-accent/60">
                <Icon name="chevronLeft" size={20} className="shrink-0 text-accent" />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Предишен урок</span>
                  <span className="block truncate font-bold text-ink">{prev.shortTitle}</span>
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link to={next.path} className="card flex items-center justify-end gap-3 p-4 text-right transition-colors hover:border-accent/60">
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Следващ урок</span>
                  <span className="block truncate font-bold text-ink">{next.shortTitle}</span>
                </span>
                <Icon name="chevronRight" size={20} className="shrink-0 text-accent" />
              </Link>
            )}
          </nav>
        </div>

        <aside className="no-print hidden xl:block">
          <div className="sticky top-24">
            <TableOfContents topic={topic} active={active} />
          </div>
        </aside>
      </div>
    </article>
  );
}
