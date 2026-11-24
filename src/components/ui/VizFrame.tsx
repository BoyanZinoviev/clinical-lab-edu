import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from '../../types';

/**
 * Рамка за научна визуализация: заглавие, пояснение, бележка, че данните са образователни,
 * и съдържание (диаграма + контроли + обяснение).
 */
export function VizFrame({
  title,
  subtitle,
  icon = 'atom',
  note,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  note?: string;
  children: ReactNode;
}) {
  return (
    <figure className="card my-6 overflow-hidden">
      <figcaption className="flex items-start gap-3 border-b border-line bg-surface2/60 px-4 py-3 sm:px-5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-ink">
          <Icon name={icon} size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="!m-0 text-base font-bold text-ink">{title}</h3>
          {subtitle && <p className="!m-0 mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </figcaption>
      <div className="p-3 sm:p-5">{children}</div>
      {note && (
        <p className="border-t border-line bg-surface2/40 px-4 py-2.5 text-xs leading-relaxed text-muted sm:px-5">
          <Icon name="info" size={13} className="mr-1.5 inline -translate-y-px" />
          {note}
        </p>
      )}
    </figure>
  );
}

/** Панел с обяснение под диаграмма (етап, подробности за избран елемент и др.). */
export function ExplainPanel({
  eyebrow,
  title,
  children,
  live = true,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  live?: boolean;
}) {
  return (
    <div
      className="rounded-xl border border-accent/30 bg-accent-soft/60 p-4"
      aria-live={live ? 'polite' : undefined}
    >
      {eyebrow && <p className="eyebrow !m-0">{eyebrow}</p>}
      <h4 className="!m-0 mt-0.5 text-[1.05rem] font-bold text-ink">{title}</h4>
      <div className="mt-1.5 space-y-2 text-[0.93rem] leading-relaxed text-ink/90">{children}</div>
    </div>
  );
}

/** Малка „таблетка“ за измерени/изчислени стойности и др. */
export function ValuePill({
  label,
  value,
  unit,
  kind,
}: {
  label: string;
  value: string;
  unit?: string;
  kind?: 'measured' | 'calculated' | 'neutral';
}) {
  const kindCls =
    kind === 'measured'
      ? 'border-cyan-500/50 bg-cyan-500/10'
      : kind === 'calculated'
        ? 'border-warn/50 bg-warn/10'
        : 'border-line bg-surface2';
  return (
    <div className={`min-w-0 rounded-lg border px-3 py-2 ${kindCls}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="text-xs font-semibold text-muted">{label}</span>
        {kind && kind !== 'neutral' && (
          <span className="shrink-0 rounded bg-surface px-1.5 text-[0.62rem] font-bold uppercase tracking-wide text-muted">
            {kind === 'measured' ? 'измерена' : 'изчислена'}
          </span>
        )}
      </div>
      <div className="mt-0.5 text-lg font-bold text-ink tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
        {value}
        {unit && <span className="ml-1 text-xs font-medium text-muted">{unit}</span>}
      </div>
    </div>
  );
}
