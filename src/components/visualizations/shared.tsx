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

/**
 * Визуално ниво на пропусканата светлина (0.1–1). Пропускането T = 10^-A се
 * „разтяга“ със степен, за да се различават ясно малки и големи абсорбции –
 * чисто илюстративно кодиране на интензитета, не измерена величина.
 */
export function beamLevel(T: number) {
  const t = Math.min(1, Math.max(0, T));
  return Math.max(0.1, Math.pow(t, 1.6));
}

/**
 * Светлинен лъч на фотометър: ярък и плътен преди кюветата, постепенно
 * отслабващ вътре в нея и по-блед, по-тънък и по-„тъмен“ (по-плътен нюанс)
 * след нея. Колкото по-голяма е абсорбцията, толкова по-слаб е лъчът.
 */
export function PhotometerBeam({
  uid,
  T,
  on,
  cuvX,
  cuvW,
  x0 = 64,
  x1 = 590,
  y = 190,
  color = 'var(--v-light)',
  dense,
}: {
  uid: string;
  T: number;
  on: boolean;
  cuvX: number;
  cuvW: number;
  x0?: number;
  x1?: number;
  y?: number;
  color?: string;
  /** По-плътен нюанс за отслабения лъч; по подразбиране – потъмнен цвят на лъча. */
  dense?: string;
}) {
  const L = beamLevel(T);
  const hi = `color-mix(in srgb, ${color} 55%, white)`;
  const lo = dense ?? `color-mix(in srgb, ${color} 62%, black)`;
  const cx1 = cuvX + cuvW;
  const aT = 0.2 + 0.7 * L; // обща плътност след кюветата
  const coreW = 1.3 + 2.1 * L; // дебелина на централната линия след кюветата
  const tr = { transition: 'opacity 0.6s ease' } as const;
  const stop = (c: string, o: number) => ({ stopColor: c, stopOpacity: o, transition: 'stop-opacity 0.6s ease' });
  const g = (n: string) => `${uid}-pb-${n}`;
  return (
    <g style={{ opacity: on ? 1 : 0, transition: 'opacity 0.4s ease' }} aria-hidden="true">
      <defs>
        <linearGradient id={g('br')} gradientUnits="userSpaceOnUse" x1={cuvX} x2={cx1} y1={y} y2={y}>
          <stop offset="0" style={stop(color, 0.9)} />
          <stop offset="1" style={stop(color, aT * L)} />
        </linearGradient>
        <linearGradient id={g('dn')} gradientUnits="userSpaceOnUse" x1={cuvX} x2={cx1} y1={y} y2={y}>
          <stop offset="0" style={stop(lo, 0)} />
          <stop offset="1" style={stop(lo, aT * (1 - L))} />
        </linearGradient>
        <linearGradient id={g('ha')} gradientUnits="userSpaceOnUse" x1={cuvX} x2={cx1} y1={y} y2={y}>
          <stop offset="0" style={stop(color, 0.18)} />
          <stop offset="1" style={stop(color, 0.18 * L)} />
        </linearGradient>
        <linearGradient id={g('co')} gradientUnits="userSpaceOnUse" x1={cuvX} x2={cx1} y1={y} y2={y}>
          <stop offset="0" style={stop(hi, 1)} />
          <stop offset="1" style={stop(hi, 0.4 + 0.6 * L)} />
        </linearGradient>
      </defs>

      {/* Ореол */}
      <rect x={x0} y={y - 19} width={cuvX - x0} height={38} rx={6} style={{ fill: color, opacity: 0.18 }} />
      <rect x={cuvX} y={y - 19} width={cuvW} height={38} fill={`url(#${g('ha')})`} />
      <rect x={cx1} y={y - 19} width={x1 - cx1} height={38} rx={6} style={{ fill: color, opacity: 0.18 * L, ...tr }} />

      {/* Тяло на лъча */}
      <rect x={x0} y={y - 11} width={cuvX - x0} height={22} style={{ fill: color, opacity: 0.9 }} />
      <rect x={cuvX} y={y - 11} width={cuvW} height={22} fill={`url(#${g('br')})`} />
      <rect x={cuvX} y={y - 11} width={cuvW} height={22} fill={`url(#${g('dn')})`} />
      <rect x={cx1} y={y - 11} width={x1 - cx1} height={22} style={{ fill: color, opacity: aT * L, ...tr }} />
      <rect x={cx1} y={y - 11} width={x1 - cx1} height={22} style={{ fill: lo, opacity: aT * (1 - L), ...tr }} />

      {/* Движеща се централна линия */}
      <line x1={x0} y1={y} x2={cuvX} y2={y} className="beam" style={{ stroke: hi }} strokeWidth={3.4} />
      <line x1={cuvX} y1={y} x2={cx1} y2={y} className="beam" stroke={`url(#${g('co')})`} strokeWidth={(3.4 + coreW) / 2} />
      <line x1={cx1} y1={y} x2={x1} y2={y} className="beam" style={{ stroke: hi, opacity: 0.4 + 0.6 * L, ...tr }} strokeWidth={coreW} />

      {/* Светене при лампата */}
      <circle cx={x0} cy={y} r={17} style={{ fill: color, opacity: 0.28 }} />
    </g>
  );
}

