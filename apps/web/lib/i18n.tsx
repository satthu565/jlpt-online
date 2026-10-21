'use client';

import React, { createContext, useContext, useEffect, useLayoutEffect, useState, useMemo } from 'react';
// No dictionary is bundled here: the root layout (a Server Component) passes the Vietnamese messages to
// I18nProvider, so they travel in the RSC payload instead of the JS bundle (≈13 KB gzip off every page);
// ja/en load on demand.

export type Locale = 'vi' | 'ja' | 'en';

export const DEFAULT_LOCALE: Locale = 'vi';
export const SUPPORTED_LOCALES: readonly Locale[] = ['vi', 'ja', 'en'] as const;

export const LOCALE_STORAGE_KEY = 'jlpt_locale';

export type MessageTree = Record<string, unknown>;

export const MESSAGES_BY_LOCALE: Record<Locale, MessageTree> = {
  vi: {},
  ja: {},
  en: {},
};

const LOCALE_LOADERS: Record<Exclude<Locale, 'vi'>, () => Promise<unknown>> = {
  ja: () => import('../messages/ja.json', { with: { type: 'json' } }),
  en: () => import('../messages/en.json', { with: { type: 'json' } }),
};

/** Installs a locale's messages (the root layout passes vi; tests register it in their setup file). */
export function registerLocaleMessages(locale: Locale, messages: MessageTree): void {
  if (!isLocaleLoaded(locale)) MESSAGES_BY_LOCALE[locale] = messages;
}

export function isLocaleLoaded(locale: Locale): boolean {
  return Object.keys(MESSAGES_BY_LOCALE[locale] ?? {}).length > 0;
}

/** Loads a locale's messages once; until then translate() falls back to Vietnamese. */
export async function loadLocaleMessages(locale: Locale): Promise<MessageTree> {
  if (locale === 'vi' || isLocaleLoaded(locale)) return MESSAGES_BY_LOCALE[locale];
  const mod = (await LOCALE_LOADERS[locale]()) as { default?: MessageTree } & MessageTree;
  MESSAGES_BY_LOCALE[locale] = (mod.default ?? mod) as MessageTree;
  return MESSAGES_BY_LOCALE[locale];
}

/**
 * Traverses nested object using dot notation (e.g. "auth.login.title")
 */
export function getNestedValue(obj: MessageTree, path: string): unknown {
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
  children?: React.ReactNode;
  initialLocale?: Locale;
  /** Vietnamese messages from the server; registered before the first render so SSR and hydration match. */
  messages?: MessageTree;
}

// Runs before paint on the client and is skipped on the server.
const useClientLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Locale saved by the learner (localStorage, then cookie), or null. */
function readSavedLocale(): Locale | null {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;
  } catch {
    // storage unavailable
  }
  try {
    const match = document.cookie.match(new RegExp('(?:^|; )' + LOCALE_STORAGE_KEY + '=([^;]*)'));
    if (match && match[1] && SUPPORTED_LOCALES.includes(match[1] as Locale)) return match[1] as Locale;
  } catch {
    // cookies unavailable
  }
  return null;
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
  messages,
}: I18nProviderProps): React.JSX.Element {
  if (messages) registerLocaleMessages(DEFAULT_LOCALE, messages);
  // Server and first client render use initialLocale; the saved locale is applied before paint.
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  useClientLayoutEffect(() => {
    const saved = readSavedLocale();
    if (saved && saved !== initialLocale) setLocaleState(saved);
  }, []);

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

  // Bumped when a lazily loaded locale arrives so the tree re-renders in that language.
  const [loadedVersion, setLoadedVersion] = useState(0);
  useEffect(() => {
    if (isLocaleLoaded(locale)) return;
    let cancelled = false;
    loadLocaleMessages(locale)
      .then(() => {
        if (!cancelled) setLoadedVersion((v) => v + 1);
      })
      .catch(() => {
        // Keep the Vietnamese fallback if the locale bundle cannot be fetched.
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

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
  }, [locale, loadedVersion]);

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
