import type { ReactNode } from 'react';

/** Текст в SVG с цвят през style (CSS правилото .viz-svg text иначе има предимство пред атрибута fill). */
export function Txt({
  x,
  y,
  children,
  size = 12,
  color = 'var(--v-ink)',
  anchor = 'start',
  weight = 500,
  mono,
  opacity = 1,
  halo,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  color?: string;
  anchor?: 'start' | 'middle' | 'end';
  weight?: number;
  mono?: boolean;
  opacity?: number;
  /** Контур в цвета на фона – за четливост върху графика. */
  halo?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      textAnchor={anchor}
      fontWeight={weight}
      className={mono ? 'mono' : undefined}
      style={halo ? { fill: color, opacity, stroke: 'var(--v-panel)', strokeWidth: 3.5, paintOrder: 'stroke', strokeLinejoin: 'round' } : { fill: color, opacity }}
    >
      {children}
    </text>
  );
}

/** Частица с леко брауново движение. */
export function Jig({
  x,
  y,
  delay = 0,
  opacity = 1,
  children,
}: {
  x: number;
  y: number;
  delay?: number;
  opacity?: number;
  children: ReactNode;
}) {
  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`} opacity={opacity}>
      <g className="jiggle" style={{ animationDelay: `${-delay}s` }}>
        {children}
      </g>
    </g>
  );
}

/** Антитяло (Y-образна форма). Раменете са надолу – към антигена. */
export function Antibody({ color = 'var(--v-antibody)', scale = 1 }: { color?: string; scale?: number }) {
  return (
    <g transform={`scale(${scale})`} stroke={color} strokeWidth={2.4} strokeLinecap="round" fill="none">
      <path d="M0 -7V0M0 0L-6 7M0 0L6 7" />
    </g>
  );
}

/** Рамка на кювета/епруветка с течност. */
export function Cuvette({
  x,
  y,
  w,
  h,
  liquidTop,
  liquid,
  liquidOpacity = 1,
  inside,
  label,
  clipId,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  liquidTop: number;
  liquid: string;
  liquidOpacity?: number;
  /** Слоеве вътре в течността (напр. цветови наслагвания) – изрязват се по контура на течността. */
  inside?: ReactNode;
  label?: string;
  clipId: string;
}) {
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={x + 3} y={liquidTop} width={w - 6} height={y + h - liquidTop - 3} rx={4} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x={x} y={liquidTop} width={w} height={y + h - liquidTop} fill={liquid} opacity={liquidOpacity} />
        {inside}
      </g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill="none" stroke="var(--v-glass)" strokeWidth={2.5} />
      {label && (
        <Txt x={x + w / 2} y={y + h + 18} anchor="middle" size={12} weight={600}>
          {label}
        </Txt>
      )}
    </g>
  );
}

/** Малка стрелка между елементи. */
export function Arrow({ x1, y1, x2, y2, color = 'var(--v-soft)', animated }: { x1: number; y1: number; x2: number; y2: number; color?: string; animated?: boolean }) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const hx = 7;
  const p1 = `${x2 - hx * Math.cos(ang - 0.45)},${y2 - hx * Math.sin(ang - 0.45)}`;
  const p2 = `${x2 - hx * Math.cos(ang + 0.45)},${y2 - hx * Math.sin(ang + 0.45)}`;
  return (
    <g stroke={color} fill="none" strokeWidth={2} strokeLinecap="round">
      <line x1={x1} y1={y1} x2={x2} y2={y2} className={animated ? 'flow-line' : undefined} />
      <polyline points={`${p1} ${x2},${y2} ${p2}`} />
    </g>
  );
}
