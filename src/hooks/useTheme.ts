import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const KEY = 'kl-theme';

function readInitial(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** Светла тема по подразбиране; тъмната е по избор и се запомня локално (ако браузърът позволява). */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(readInitial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* localStorage може да е недостъпен – не е критично */
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return { theme, toggle };
}
