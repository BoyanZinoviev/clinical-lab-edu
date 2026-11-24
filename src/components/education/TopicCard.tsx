import { Icon } from '../ui/Icon';
import { Link } from '../ui/Link';
import type { Topic } from '../../types';

export function TopicCard({ topic, index }: { topic: Topic; index: number }) {
  return (
    <article className="card group flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[var(--shadow-pop)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-navy-700 to-teal-600 text-white shadow-sm">
          <Icon name={topic.icon} size={24} />
        </span>
        <span className="text-xs font-bold tabular-nums text-muted">Модул {index}</span>
      </div>
      <p className="eyebrow !m-0">{topic.category}</p>
      <h3 className="!mb-1.5 !mt-1 text-[1.1rem] font-bold leading-snug text-ink">{topic.shortTitle}</h3>
      <p className="!m-0 flex-1 text-[0.9rem] leading-relaxed text-muted">{topic.description}</p>
      <Link to={topic.path} className="btn btn-primary mt-4 w-full">
        Отвори урока <Icon name="arrowRight" size={17} />
      </Link>
    </article>
  );
}
