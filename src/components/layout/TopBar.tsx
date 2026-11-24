import { Icon } from '../ui/Icon';
import { Breadcrumbs } from '../navigation/Breadcrumbs';
import type { Route } from '../../lib/router';
import type { Theme } from '../../hooks/useTheme';

interface Props {
  route: Route;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenMenu: () => void;
  onOpenSearch: () => void;
  menuOpen: boolean;
}

export function TopBar({ route, theme, onToggleTheme, onOpenMenu, onOpenSearch, menuOpen }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1240px] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 lg:px-10">
        <button
          type="button"
          className="btn !min-h-10 !px-2.5 lg:hidden"
          onClick={onOpenMenu}
          aria-label="Отвори менюто"
          aria-expanded={menuOpen}
          aria-controls="sidebar"
        >
          <Icon name="menu" size={20} />
        </button>

        <div className="min-w-0 flex-1">
          <Breadcrumbs route={route} />
        </div>

        <button
          type="button"
          className="btn !min-h-10 gap-2 !px-3 text-muted"
          onClick={onOpenSearch}
          aria-label="Търсене в уроците (Ctrl+K)"
          title="Търсене (Ctrl+K)"
        >
          <Icon name="search" size={18} />
          <span className="hidden sm:inline">Търсене</span>
          <kbd className="hidden rounded border border-line bg-surface2 px-1.5 text-[0.7rem] font-semibold text-muted md:inline">Ctrl K</kbd>
        </button>

        <button
          type="button"
          className="btn !min-h-10 !px-2.5"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Превключи към светла тема' : 'Превключи към тъмна тема'}
          title={theme === 'dark' ? 'Светла тема' : 'Тъмна тема'}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
        </button>
      </div>
    </header>
  );
}
