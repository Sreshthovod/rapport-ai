import { useEffect, useState } from 'react';
import { detectSystemTheme } from '../Theme.js';
import { ThemeMode } from '../types.js';

export function useTheme(initialTheme?: ThemeMode): ThemeMode {
  const [theme, setTheme] = useState<ThemeMode>(initialTheme || detectSystemTheme());

  useEffect(() => {
    if (initialTheme) {
      setTheme(initialTheme);
      return;
    }

    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [initialTheme]);

  return theme;
}
