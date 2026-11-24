import type { ReactNode } from 'react';
import type { IconName } from '../../types';

/**
 * Локален набор от линейни икони (24×24) – без външни зависимости и без мрежа.
 */
const paths: Record<IconName, ReactNode> = {
  home: (<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>),
  menu: (<><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>),
  x: (<><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>),
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>),
  moon: (<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />),
  chevronRight: (<path d="M9 6l6 6-6 6" />),
  chevronLeft: (<path d="M15 6l-6 6 6 6" />),
  chevronDown: (<path d="M6 9l6 6 6-6" />),
  chevronUp: (<path d="M6 15l6-6 6 6" />),
  play: (<path d="M7 4.5l12 7.5-12 7.5z" fill="currentColor" />),
  pause: (<><rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" /><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" /></>),
  restart: (<><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></>),
  skipBack: (<><path d="M19 19L9 12l10-7z" fill="currentColor" /><path d="M5 5v14" /></>),
  skipForward: (<><path d="M5 5l10 7-10 7z" fill="currentColor" /><path d="M19 5v14" /></>),
  droplet: (<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />),
  flask: (<><path d="M9 3h6" /><path d="M10 3v6L4.6 18.6A1.6 1.6 0 0 0 6 21h12a1.6 1.6 0 0 0 1.4-2.4L14 9V3" /><path d="M7.5 14h9" /></>),
  testTube: (<><path d="M14.5 3v15a3 3 0 0 1-6 0V3" /><path d="M7 3h9" /><path d="M8.5 12h6" /></>),
  beaker: (<><path d="M6 3h12" /><path d="M7 3v16a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V3" /><path d="M7 10h10" /></>),
  activity: (<path d="M3 12h4l3-8 4 16 3-8h4" />),
  zap: (<path d="M13 2L4 14h7l-1 8 9-12h-7z" />),
  wind: (<><path d="M3 8h11a3 3 0 1 0-3-3" /><path d="M3 12h16a3 3 0 1 1-3 3" /><path d="M3 16h8a2.5 2.5 0 1 1-2.5 2.5" /></>),
  layers: (<><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 12.5l9 5 9-5" /><path d="M3 17l9 5 9-5" /></>),
  sliders: (<><path d="M4 6h8M16 6h4M4 12h2M10 12h10M4 18h10M18 18h2" /><circle cx="14" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="16" cy="18" r="2" /></>),
  lineChart: (<><path d="M3 3v18h18" /><path d="M7 15l4-5 3 3 5-7" /></>),
  shieldCheck: (<><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></>),
  book: (<><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 21V5" /><path d="M8 7h7" /></>),
  check: (<path d="M5 12.5l5 5 9-10" />),
  alert: (<><path d="M12 3l10 18H2z" /><path d="M12 10v5" /><path d="M12 18h.01" /></>),
  target: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>),
  atom: (<><circle cx="12" cy="12" r="1.6" /><ellipse cx="12" cy="12" rx="10" ry="4" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" /></>),
  gauge: (<><path d="M4 18a9 9 0 1 1 16 0" /><path d="M12 14l4-5" /><circle cx="12" cy="14" r="1.2" /></>),
  compare: (<><path d="M7 4v13" /><path d="M3 8l4-4 4 4" /><path d="M17 20V7" /><path d="M13 16l4 4 4-4" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  graduation: (<><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5" /></>),
  lock: (<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  cpu: (<><rect x="6" y="6" width="12" height="12" rx="2" /><rect x="9.5" y="9.5" width="5" height="5" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></>),
  ruler: (<><path d="M3 17L17 3l4 4L7 21z" /><path d="M7 13l2 2M10 10l2 2M13 7l2 2" /></>),
  arrowRight: (<><path d="M4 12h16" /><path d="M14 6l6 6-6 6" /></>),
  eye: (<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  link: (<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>),
  list: (<><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>),
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  title?: string;
}

export function Icon({ name, size = 20, className, strokeWidth = 1.9, title }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
