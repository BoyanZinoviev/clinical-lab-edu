import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Icon } from '../ui/Icon';
import { searchTopics } from '../../data/searchIndex';
import { navigate } from '../../lib/router';
import type { SearchEntry } from '../../data/searchIndex';

const kindLabel: Record<SearchEntry['kind'], string> = {
  topic: 'Урок',
  section: 'Раздел',
  term: 'Термин',
  question: 'Въпрос',
};

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const results = useMemo(() => searchTopics(query), [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const go = (e: SearchEntry) => {
    navigate(e.path, e.section);
    onClose();
  };

  const onKeyDown = (ev: ReactKeyboardEvent) => {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      onClose();
    } else if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (ev.key === 'Enter' && results[active]) {
      ev.preventDefault();
      go(results[active]);
    } else if (ev.key === 'Tab') {
      // Прост капан на фокуса вътре в диалога
      const focusables = (ev.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('input, button');
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (ev.shiftKey && document.activeElement === first) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[8vh] sm:pt-[12vh]" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-navy-950/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Търсене в уроците"
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)]"
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Icon name="search" size={20} className="text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder="Търси урок, термин или въпрос – напр. „Nernst“, „калибрация“, „1-3s“…"
            aria-label="Търсене"
            aria-controls="search-results"
            aria-activedescendant={results[active] ? `sr-${active}` : undefined}
            className="min-w-0 flex-1 bg-transparent py-1.5 text-base text-ink outline-none placeholder:text-muted/70"
            autoComplete="off"
          />
          <button type="button" className="btn btn-ghost !min-h-8 !px-2" onClick={onClose} aria-label="Затвори търсенето">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim().length < 2 ? (
            <p className="p-5 text-sm text-muted">
              Въведи поне две букви. Търсенето обхваща всички уроци, въпроси, раздели и термини.
            </p>
          ) : results.length === 0 ? (
            <p className="p-5 text-sm text-muted">Няма резултати за „{query}“. Опитай с друга дума или съкращение.</p>
          ) : (
            <ul id="search-results" ref={listRef} role="listbox" aria-label="Резултати" className="p-2">
              {results.map((r, i) => (
                <li key={`${r.path}-${r.section ?? ''}-${r.kind}-${r.label}-${i}`} role="presentation">
                  <button
                    type="button"
                    id={`sr-${i}`}
                    role="option"
                    aria-selected={i === active}
                    data-idx={i}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r)}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      i === active ? 'bg-accent-soft' : 'hover:bg-surface2'
                    }`}
                  >
                    <span className="mt-0.5 shrink-0 rounded-md border border-line bg-surface px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-muted">
                      {kindLabel[r.kind]}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[0.93rem] font-semibold text-ink">{r.label}</span>
                      {r.snippet && <span className="block truncate text-xs text-muted">{r.snippet}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-line bg-surface2/60 px-4 py-2 text-xs text-muted">
          <span>↑ ↓ за избор · Enter за отваряне · Esc за затваряне</span>
          <span>{results.length > 0 ? `${results.length} резултата` : ''}</span>
        </div>
      </div>
    </div>
  );
}
