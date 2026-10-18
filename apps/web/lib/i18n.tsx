'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import viMessages from '../messages/vi.json' with { type: 'json' };
import jaMessages from '../messages/ja.json' with { type: 'json' };
import enMessages from '../messages/en.json' with { type: 'json' };

export type Locale = 'vi' | 'ja' | 'en';

export const DEFAULT_LOCALE: Locale = 'vi';
export const SUPPORTED_LOCALES: readonly Locale[] = ['vi', 'ja', 'en'] as const;

export const LOCALE_STORAGE_KEY = 'jlpt_locale';

type MessageTree = Record<string, unknown>;

const MESSAGES_BY_LOCALE: Record<Locale, MessageTree> = {
  vi: viMessages as MessageTree,
  ja: jaMessages as MessageTree,
  en: enMessages as MessageTree,
};

/**
 * Traverses nested object using dot notation (e.g. "auth.login.title")
 */
function getNestedValue(obj: MessageTree, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Resolves a translated string with clear fallback to DEFAULT_LOCALE (vi), then key itself.
 */
export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  // 1. Try specified locale
  let value = getNestedValue(MESSAGES_BY_LOCALE[locale], key);

  // 2. Clear fallback to default locale if missing or empty
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    value = getNestedValue(MESSAGES_BY_LOCALE[DEFAULT_LOCALE], key);
  }

  // 3. Fallback to key path itself if not found anywhere
  if (typeof value !== 'string') {
    return key;
  }

  // 4. Parameter interpolation: replace {name} with params.name
  if (params) {
    return value.replace(/{(\w+)}/g, (_, paramName: string) => {
      return paramName in params ? String(params[paramName]) : `{${paramName}}`;
    });
  }

  return value;
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (newLocale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: I18nProviderProps): React.JSX.Element {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
        if (saved && SUPPORTED_LOCALES.includes(saved)) {
          return saved;
        }
      } catch {
        // Fallback
      }
      try {
        const match = document.cookie.match(new RegExp('(?:^|; )' + LOCALE_STORAGE_KEY + '=([^;]*)'));
        if (match && match[1] && SUPPORTED_LOCALES.includes(match[1] as Locale)) {
          return match[1] as Locale;
        }
      } catch {
        // Fallback
      }
    }
    return initialLocale;
  });

  const setLocale = (newLocale: Locale) => {
    if (!SUPPORTED_LOCALES.includes(newLocale)) return;
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      document.cookie = `${LOCALE_STORAGE_KEY}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Inaccessible storage
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      // Add or remove font-japanese class on body or html
      if (locale === 'ja') {
        document.documentElement.classList.add('font-japanese');
      } else {
        document.documentElement.classList.remove('font-japanese');
      }
    }
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    return {
      locale,
      setLocale,
      t: (key: string, params?: Record<string, string | number>) =>
        translate(locale, key, params),
    };
  }, [locale]);

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    // Return safe default if rendered without provider
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (key: string, params?: Record<string, string | number>) =>
        translate(DEFAULT_LOCALE, key, params),
    };
  }
  return context;
}
