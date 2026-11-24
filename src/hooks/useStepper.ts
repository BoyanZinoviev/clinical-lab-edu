import { useCallback, useEffect, useState } from 'react';

export interface Stepper {
  step: number;
  count: number;
  playing: boolean;
  isFirst: boolean;
  isLast: boolean;
  next: () => void;
  prev: () => void;
  goto: (i: number) => void;
  play: () => void;
  pause: () => void;
  restart: () => void;
}

/**
 * Управление на последователни етапи (Назад / Напред / Пусни / Пауза / Рестарт).
 * Автоматичното възпроизвеждане преминава през етапите през зададен интервал.
 */
export function useStepper(count: number, autoplayMs = 5200): Stepper {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => {
      setStep((s) => {
        if (s >= count - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, autoplayMs);
    return () => window.clearTimeout(id);
  }, [playing, step, count, autoplayMs]);

  const next = useCallback(() => setStep((s) => Math.min(count - 1, s + 1)), [count]);
  const prev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);
  const goto = useCallback((i: number) => setStep(Math.max(0, Math.min(count - 1, i))), [count]);
  const play = useCallback(() => {
    setStep((s) => (s >= count - 1 ? 0 : s));
    setPlaying(true);
  }, [count]);
  const pause = useCallback(() => setPlaying(false), []);
  const restart = useCallback(() => {
    setStep(0);
    setPlaying(false);
  }, []);

  return {
    step,
    count,
    playing,
    isFirst: step === 0,
    isLast: step === count - 1,
    next,
    prev,
    goto,
    play,
    pause,
    restart,
  };
}
