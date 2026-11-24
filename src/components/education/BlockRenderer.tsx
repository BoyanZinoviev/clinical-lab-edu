import { Callout } from '../ui/Callout';
import { RichText } from '../ui/RichText';
import type { Block } from '../../types';

function QA({ n, q, a }: { n?: number; q: string; a: Block[] }) {
  return (
    <div className="my-5 rounded-xl border border-line bg-surface">
      <div className="flex items-start gap-3 border-b border-line bg-surface2/60 px-4 py-3">
        {n !== undefined && (
          <span className="mt-0.5 flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg bg-brand px-1.5 text-xs font-bold text-brand-ink">
            {n}
          </span>
        )}
        <h3 className="!m-0 text-[1.02rem] font-bold leading-snug text-ink">
          <RichText text={q} />
        </h3>
      </div>
      <div className="px-4 pb-3 pt-1">
        <BlockRenderer blocks={a} />
      </div>
    </div>
  );
}

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'p':
            return (
              <p key={i}>
                <RichText text={b.text} />
              </p>
            );
          case 'h3':
            return (
              <h3 key={i} className="mb-1 mt-6 text-lg font-bold text-ink">
                <RichText text={b.text} />
              </h3>
            );
          case 'ul':
            return (
              <ul key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <RichText text={it} />
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <RichText text={it} />
                  </li>
                ))}
              </ol>
            );
          case 'callout':
            return <Callout key={i} tone={b.tone} title={b.title} text={b.text} />;
          case 'qa':
            return <QA key={i} n={b.n} q={b.q} a={b.a} />;
          case 'formula':
            return (
              <figure key={i} className="my-4 overflow-x-auto rounded-xl border border-line bg-surface2/70 px-4 py-3 text-center">
                <p className="!m-0 whitespace-nowrap text-[1.05rem] font-semibold text-ink" style={{ fontFamily: 'var(--font-mono)' }}>
                  {b.expr}
                </p>
                {b.caption && (
                  <figcaption className="mt-1.5 whitespace-normal text-xs text-muted">
                    <RichText text={b.caption} />
                  </figcaption>
                )}
              </figure>
            );
          case 'table':
            return (
              <div key={i} className="my-4 overflow-x-auto rounded-xl border border-line">
                <table>
                  {b.caption && <caption className="p-2 text-left text-xs text-muted">{b.caption}</caption>}
                  <thead>
                    <tr>
                      {b.headers.map((h, j) => (
                        <th key={j} scope="col">
                          <RichText text={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>
                        {r.map((c, k) => (
                          <td key={k}>
                            <RichText text={c} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </>
  );
}
