import { useState } from 'react';
import { Icon } from '../ui/Icon';
import { Link } from '../ui/Link';
import { methodTopics } from '../../data/topics';
import type { Route } from '../../lib/router';
import type { IconName } from '../../types';

interface Props {
  route: Route;
  open: boolean;
  onClose: () => void;
}

function NavItem({
  to,
  icon,
  label,
  active,
  onNavigate,
  small,
}: {
  to: string;
  icon: IconName;
  label: string;
  active: boolean;
  onNavigate: () => void;
  small?: boolean;
}) {
  return (
    <Link
      to={to}
      ariaCurrent={active}
      onClick={onNavigate}
      className={`relative flex items-center gap-3 rounded-xl px-3 ${small ? 'py-2 text-[0.88rem]' : 'py-2.5 text-[0.93rem]'} font-semibold leading-snug transition-colors ${
        active
          ? 'bg-accent-soft text-ink before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-full before:bg-accent'
          : 'text-muted hover:bg-surface2 hover:text-ink'
      }`}
    >
      <Icon name={icon} size={small ? 17 : 19} className={active ? 'text-accent' : ''} />
      <span>{label}</span>
    </Link>
  );
}

export function Sidebar({ route, open, onClose }: Props) {
  const methodsActive = route.path === '/metodi' || route.path.startsWith('/metodi/');
  const [methodsOpen, setMethodsOpen] = useState(true);

  return (
    <>
      {/* Затъмнение зад мобилното меню */}
      <div
        className={`fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-[2px] transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        id="sidebar"
        aria-label="Основна навигация"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-surface transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-navy-700 to-teal-600 text-white shadow-sm">
            <Icon name="flask" size={22} />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="!m-0 text-[0.95rem] font-extrabold text-ink">Клинична лаборатория</p>
            <p className="!m-0 text-xs font-medium text-muted">Интерактивно обучение</p>
          </div>
          <button type="button" className="btn btn-ghost ml-auto !min-h-9 !px-2 lg:hidden" onClick={onClose} aria-label="Затвори менюто">
            <Icon name="x" size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Раздели">
          <ul className="space-y-1">
            <li>
              <NavItem to="/" icon="home" label="Начало" active={route.path === '/'} onNavigate={onClose} />
            </li>

            <li>
              <div className="flex items-stretch gap-1">
                <div className="min-w-0 flex-1">
                  <NavItem to="/metodi" icon="beaker" label="Аналитични методи" active={route.path === '/metodi'} onNavigate={onClose} />
                </div>
                <button
                  type="button"
                  className="btn btn-ghost !min-h-0 !px-2"
                  aria-expanded={methodsOpen}
                  aria-controls="methods-sub"
                  aria-label={methodsOpen ? 'Свий аналитичните методи' : 'Разгъни аналитичните методи'}
                  onClick={() => setMethodsOpen((v) => !v)}
                >
                  <Icon name={methodsOpen || methodsActive ? 'chevronUp' : 'chevronDown'} size={18} />
                </button>
              </div>
              {(methodsOpen || methodsActive) && (
                <ul id="methods-sub" className="ml-5 mt-1 space-y-0.5 border-l border-line pl-2">
                  {methodTopics.map((t) => (
                    <li key={t.id}>
                      <NavItem to={t.path} icon={t.icon} label={t.shortTitle} active={route.path === t.path} onNavigate={onClose} small />
                    </li>
                  ))}
                </ul>
              )}
            </li>

            <li>
              <NavItem to="/kalibraciya" icon="ruler" label="Калибрация" active={route.path === '/kalibraciya'} onNavigate={onClose} />
            </li>
            <li>
              <NavItem
                to="/kachestven-kontrol"
                icon="shieldCheck"
                label="Вътрешнолабораторен качествен контрол"
                active={route.path === '/kachestven-kontrol'}
                onNavigate={onClose}
              />
            </li>
            <li>
              <NavItem to="/za-proekta" icon="info" label="За проекта" active={route.path === '/za-proekta'} onNavigate={onClose} />
            </li>
          </ul>
        </nav>

        <div className="border-t border-line p-4">
          <p className="!m-0 rounded-lg bg-surface2 p-3 text-xs leading-relaxed text-muted">
            <Icon name="lock" size={13} className="mr-1 inline -translate-y-px" />
            Образователен материал. Не е предназначен за клинична диагностика или решения за конкретен пациент.
          </p>
        </div>
      </aside>
    </>
  );
}
