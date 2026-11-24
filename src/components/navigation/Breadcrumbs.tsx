import { Icon } from '../ui/Icon';
import { Link } from '../ui/Link';
import { topicByPath } from '../../data/topics';
import type { Route } from '../../lib/router';

interface Crumb {
  label: string;
  to?: string;
}

export function crumbsFor(route: Route): Crumb[] {
  const home: Crumb = { label: 'Начало', to: '/' };
  const p = route.path;
  if (p === '/') return [{ label: 'Начало' }];
  if (p === '/metodi') return [home, { label: 'Аналитични методи' }];
  if (p === '/za-proekta') return [home, { label: 'За проекта' }];
  const topic = topicByPath(p);
  if (topic) {
    if (topic.group === 'metodi') {
      return [home, { label: 'Аналитични методи', to: '/metodi' }, { label: topic.shortTitle }];
    }
    return [home, { label: topic.group === 'kontrol' ? 'Вътрешнолабораторен качествен контрол' : topic.shortTitle }];
  }
  return [home, { label: 'Страницата не е намерена' }];
}

export function Breadcrumbs({ route }: { route: Route }) {
  const crumbs = crumbsFor(route);
  return (
    <nav aria-label="Път на страницата" className="min-w-0">
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-muted">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={i} className="flex min-w-0 items-center gap-1">
              {i > 0 && <Icon name="chevronRight" size={14} className="shrink-0 opacity-60" />}
              {c.to && !last ? (
                <Link to={c.to} className="rounded px-1 font-medium hover:text-ink hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span className={`truncate px-1 ${last ? 'font-semibold text-ink' : ''}`} aria-current={last ? 'page' : undefined}>
                  {c.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
