import { useSyncExternalStore } from 'react';

/**
 * Минимален hash-маршрутизатор (#/път?s=секция).
 * Работи без сървър, от статичен хостинг и дори директно от файловата система.
 */
export interface Route {
  path: string;
  section?: string;
}

function subscribe(cb: () => void): () => void {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

function getHash(): string {
  return window.location.hash;
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [p, q] = raw.split('?');
  let path = p.startsWith('/') ? p : `/${p}`;
  if (path.length > 1) path = path.replace(/\/+$/, '');
  const params = new URLSearchParams(q ?? '');
  const section = params.get('s') ?? undefined;
  return { path, section };
}

export function hrefFor(path: string, section?: string): string {
  return `#${path}${section ? `?s=${encodeURIComponent(section)}` : ''}`;
}

export function navigate(path: string, section?: string): void {
  window.location.hash = hrefFor(path, section).slice(1);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, () => '');
  return parseHash(hash);
}

export function sectionElementId(sectionId: string): string {
  return `sec-${sectionId}`;
}

export function scrollToSection(sectionId: string, smooth = true): void {
  const el = document.getElementById(sectionElementId(sectionId));
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: smooth && !reduce ? 'smooth' : 'auto', block: 'start' });
}
