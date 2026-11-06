'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  /** Sets one specific theme (the Light / Dark control in the account menu). */
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark', toggle: () => {}, setTheme: () => {} });

/**
 * Reads the class set by the blocking inline script in layout.tsx (see
 * <ThemeScript />) so the first client render matches the server-painted DOM.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('light') ? 'light' : 'dark');
  }, []);

  const apply = useCallback((next: Theme) => {
    document.documentElement.classList.toggle('light', next === 'light');
    try {
      localStorage.setItem('dd-theme', next);
    } catch {
      /* ignore */
    }
    setTheme(next);
  }, []);

  const toggle = useCallback(() => {
    apply(document.documentElement.classList.contains('light') ? 'dark' : 'light');
  }, [apply]);

  return <ThemeContext.Provider value={{ theme, toggle, setTheme: apply }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Inline, render-blocking script: applies the saved/preferred theme class to
 * <html> before first paint to avoid a flash. Mirrors the original's head script.
 */
export function ThemeScript() {
  const js = `(function(){try{var s=localStorage.getItem('dd-theme');var p=window.matchMedia('(prefers-color-scheme: light)').matches;if(s==='light'||(!s&&p)){document.documentElement.classList.add('light');}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
