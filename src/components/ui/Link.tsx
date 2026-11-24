import type { ReactNode } from 'react';
import { hrefFor } from '../../lib/router';

/** Вътрешна връзка (hash-маршрут). Работи нативно – без JavaScript обработка на клик. */
export function Link({
  to,
  section,
  className,
  children,
  ariaCurrent,
  onClick,
  title,
}: {
  to: string;
  section?: string;
  className?: string;
  children: ReactNode;
  ariaCurrent?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <a
      href={hrefFor(to, section)}
      className={className}
      aria-current={ariaCurrent ? 'page' : undefined}
      onClick={onClick}
      title={title}
    >
      {children}
    </a>
  );
}
