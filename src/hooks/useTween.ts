import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * Плавно придвижва масив от числа към целеви стойности (експоненциално затихване).
 * Използва се за анимация на молекули, цветове, потенциали и др. При „намалено движение“ скача директно към целта.
 * Може да се прекъсне по всяко време – новата цел просто променя посоката на движение.
 */
export function useTween(target: readonly number[], rate = 5): number[] {
  const reduced = useReducedMotion();
  const [cur, setCur] = useState<number[]>(() => target.slice());
  const curRef = useRef<number[]>(target.slice());
  const targetRef = useRef<readonly number[]>(target);
  const rafRef = useRef(0);
  const key = target.join('|');

  useEffect(() => {
    targetRef.current = target;
    if (reduced || curRef.current.length !== target.length) {
      curRef.current = target.slice();
      setCur(curRef.current);
      return;
    }
    cancelAnimationFrame(rafRef.current);
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      const k = 1 - Math.exp(-dt * rate);
      let moving = false;
      const tgt = targetRef.current;
      const next = curRef.current.map((v, i) => {
        const d = tgt[i] - v;
        if (Math.abs(d) < 0.015) return tgt[i];
        moving = true;
        return v + d * k;
      });
      curRef.current = next;
      setCur(next);
      if (moving) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduced, rate]);

  return cur;
}
