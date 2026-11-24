import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from '../../types';
import type { Stepper } from '../../hooks/useStepper';

/* ───────── Бутон-икона с подсказка ───────── */
export function IconButton({
  icon,
  label,
  onClick,
  disabled,
  active,
  primary,
  showLabel,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  primary?: boolean;
  showLabel?: boolean;
}) {
  return (
    <button
      type="button"
      className={`btn ${primary ? 'btn-primary' : ''} ${active ? 'ring-2 ring-accent/40' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <Icon name={icon} size={18} />
      {showLabel && <span>{label}</span>}
    </button>
  );
}

/* ───────── Плъзгач със заглавие и стойност ───────── */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  hint,
  id,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display?: string;
  hint?: string;
  id: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        <output htmlFor={id} className="mono rounded-md bg-surface2 px-2 py-0.5 text-sm font-semibold text-ink tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
          {display ?? String(value)}
        </output>
      </div>
      <input
        id={id}
        className="range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ['--fill' as string]: `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="-mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/* ───────── Сегментиран избор (радио-група) ───────── */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  size = 'md',
}: {
  label: string;
  options: { value: T; label: ReactNode; sub?: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`rounded-xl border px-3.5 text-left transition-colors ${size === 'sm' ? 'py-1.5 text-sm' : 'py-2'} ${
              active
                ? 'border-accent bg-accent-soft text-ink shadow-sm'
                : 'border-line bg-surface text-muted hover:border-accent/50 hover:text-ink'
            }`}
          >
            <span className="block text-sm font-semibold leading-tight">{o.label}</span>
            {o.sub && <span className="block text-xs leading-tight opacity-80">{o.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ───────── Превключвател ───────── */
export function Toggle({
  label,
  checked,
  onChange,
  id,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
      <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className="relative h-6 w-11 rounded-full border border-line bg-surface2 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4.5 after:w-4.5 after:rounded-full after:bg-muted after:transition-all peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:after:translate-x-5 peer-checked:after:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent"
      />
      {label}
    </label>
  );
}

/* ───────── Управление на етапи: Назад / Пусни / Пауза / Рестарт / Напред ───────── */
export function StepControls({
  stepper,
  labels,
}: {
  stepper: Stepper;
  labels: string[];
}) {
  const { step, count, playing } = stepper;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <IconButton icon="skipBack" label="Предишен етап" onClick={stepper.prev} disabled={stepper.isFirst} showLabel />
        {playing ? (
          <IconButton icon="pause" label="Пауза" onClick={stepper.pause} primary showLabel />
        ) : (
          <IconButton icon="play" label="Пусни" onClick={stepper.play} primary showLabel />
        )}
        <IconButton icon="skipForward" label="Следващ етап" onClick={stepper.next} disabled={stepper.isLast} showLabel />
        <IconButton icon="restart" label="Отначало" onClick={stepper.restart} showLabel />
        <span className="ml-auto text-sm font-semibold text-muted tabular-nums" aria-live="polite">
          Етап {step + 1} от {count}
        </span>
      </div>
      <ol className="flex flex-wrap gap-1.5" aria-label="Етапи на процеса">
        {labels.map((l, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => stepper.goto(i)}
              aria-current={i === step ? 'step' : undefined}
              title={l}
              className={`flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-xs font-bold transition-colors ${
                i === step
                  ? 'border-accent bg-accent text-brand-ink'
                  : i < step
                    ? 'border-accent/50 bg-accent-soft text-accent'
                    : 'border-line bg-surface text-muted hover:border-accent/50'
              }`}
              style={i === step ? { color: 'var(--surface)' } : undefined}
            >
              {i + 1}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
