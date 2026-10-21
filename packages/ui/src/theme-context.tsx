'use client';

import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import type { ThemeMode, ActiveTheme } from './tokens.js';

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ActiveTheme;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'jlpt_theme_mode';

// Runs before paint on the client and is skipped on the server.
const useClientLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function getSystemTheme(): ActiveTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps): React.JSX.Element {
  // Server and first client render agree (defaultTheme, light system theme); stored and system values
  // are applied before paint to avoid a hydration mismatch.
  const [theme, setThemeState] = useState<ThemeMode>(defaultTheme);

  const [systemTheme, setSystemTheme] = useState<ActiveTheme>('light');

  useClientLayoutEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey) as ThemeMode | null;
      if (saved && ['light', 'dark', 'system'].includes(saved)) setThemeState(saved);
    } catch {
      // Fallback if localStorage is inaccessible
    }
    setSystemTheme(getSystemTheme());
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const resolvedTheme: ActiveTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(storageKey, newTheme);
      // Also store in cookie for server-side hints
      document.cookie = `${storageKey}=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Inaccessible storage
    }
  };

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    // Provide safe fallback when rendered outside ThemeProvider
    return {
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}
