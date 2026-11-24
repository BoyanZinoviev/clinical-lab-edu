import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { SearchDialog } from '../navigation/SearchDialog';
import { useTheme } from '../../hooks/useTheme';
import { scrollToSection } from '../../lib/router';
import type { Route } from '../../lib/router';

export function AppShell({ route, children }: { route: Route; children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // При смяна на маршрута: превъртане нагоре или към заявената секция.
  useEffect(() => {
    setMenuOpen(false);
    const sec = route.section;
    if (sec) {
      const t = window.setTimeout(() => scrollToSection(sec, false), 60);
      return () => window.clearTimeout(t);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route.path, route.section]);

  // Клавишна комбинация за търсене и Escape за менюто.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const focusMain = useCallback(() => mainRef.current?.focus(), []);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <button type="button" className="skip-link" onClick={focusMain}>
        Към съдържанието
      </button>
      <Sidebar route={route} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-72">
        <TopBar
          route={route}
          theme={theme}
          onToggleTheme={toggle}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
          menuOpen={menuOpen}
        />
        <main
          id="main"
          ref={mainRef}
          tabIndex={-1}
          className="mx-auto max-w-[1240px] px-3 py-6 outline-none sm:px-6 lg:px-10 lg:py-8"
        >
          {children}
        </main>
        <footer className="mx-auto max-w-[1240px] px-3 pb-10 pt-4 text-xs leading-relaxed text-muted sm:px-6 lg:px-10">
          <p className="!m-0 border-t border-line pt-4">
            Клинична лаборатория – Интерактивно обучение. Образователен проект: всички числови примери са илюстративни и не представляват
            реални резултати на пациенти. Приложението работи изцяло в браузъра, без сървър и без интернет връзка.
          </p>
          <p className="!mb-0 !mt-2 font-medium text-ink">© 2026 Boyan Zinoviev. Всички права запазени.</p>
        </footer>
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
