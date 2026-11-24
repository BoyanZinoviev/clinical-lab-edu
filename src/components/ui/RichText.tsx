import { Fragment, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Лек разбор на вграден текст:
 *   **удебелено**
 *   {{термин|обяснение на български}}  →  термин с подсказка (tooltip), достъпна и с клавиатура
 */
const TOKEN = /(\*\*[^*]+\*\*|\{\{[^}|]+\|[^}]+\}\})/g;

function Tip({ term, text }: { term: string; text: string }) {
  const id = useId();
  const bubble = useRef<HTMLSpanElement>(null);
  const [dx, setDx] = useState(0);

  /** Придържа подсказката във видимата част на екрана (важно на телефон, когато терминът е до ръба). */
  const place = () => {
    const el = bubble.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    const vw = document.documentElement.clientWidth;
    const left = r.left - dx;
    const right = r.right - dx;
    let shift = 0;
    if (left < margin) shift = margin - left;
    else if (right > vw - margin) shift = vw - margin - right;
    setDx(Math.round(shift));
  };

  return (
    <span className="group relative inline-block" onMouseEnter={place} onFocus={place}>
      <span className="tip" tabIndex={0} aria-describedby={id}>
        {term}
      </span>
      <span
        id={id}
        ref={bubble}
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-2 w-60 max-w-[calc(100vw-1rem)] rounded-lg border border-line bg-surface p-2.5 text-left text-xs font-normal leading-snug text-ink opacity-0 shadow-[var(--shadow-pop)] transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
        style={{ whiteSpace: 'normal', transform: `translateX(calc(-50% + ${dx}px))` }}
      >
        {text}
      </span>
    </span>
  );
}

export function RichText({ text }: { text: string }): ReactNode {
  const parts = text.split(TOKEN);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('{{') && part.endsWith('}}')) {
          const [term, ...rest] = part.slice(2, -2).split('|');
          return <Tip key={i} term={term} text={rest.join('|')} />;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
