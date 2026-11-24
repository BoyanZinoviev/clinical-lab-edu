import { useCallback, useEffect, useRef, useState } from 'react';

export interface SimClock {
  /** Симулирано време (в единици, зададени от потребителя на хука – напр. минути). */
  time: number;
  playing: boolean;
  speed: number;
  setSpeed: (s: number) => void;
  play: () => void;
  pause: () => void;
  restart: () => void;
  seek: (t: number) => void;
}

/**
 * Часовник за непрекъснати симулации (напр. хроматографски пробег).
 * `unitsPerSecond` – колко симулирани единици минават за 1 реална секунда при скорост 1×.
 */
export function useSimClock(duration: number, unitsPerSecond: number): SimClock {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timeRef = useRef(0);
  const speedRef = useRef(1);
  speedRef.current = speed;

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
      last = now;
      const t = Math.min(duration, timeRef.current + dt * unitsPerSecond * speedRef.current);
      timeRef.current = t;
      setTime(t);
      if (t >= duration) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration, unitsPerSecond]);

  const play = useCallback(() => {
    if (timeRef.current >= duration) {
      timeRef.current = 0;
      setTime(0);
    }
    setPlaying(true);
  }, [duration]);
  const pause = useCallback(() => setPlaying(false), []);
  const restart = useCallback(() => {
    timeRef.current = 0;
    setTime(0);
    setPlaying(false);
  }, []);
  const seek = useCallback(
    (t: number) => {
      const v = Math.max(0, Math.min(duration, t));
      timeRef.current = v;
      setTime(v);
    },
    [duration],
  );

  return { time, playing, speed, setSpeed, play, pause, restart, seek };
}
