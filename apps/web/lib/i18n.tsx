'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  type Locale,
  type MessageTree,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  LOCALE_STORAGE_KEY,
  MESSAGES_BY_LOCALE,
  loadLocaleMessages,
  getNestedValue,
  translate,
} from './i18n-core';

export {
  type Locale,
  type MessageTree,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  LOCALE_STORAGE_KEY,
  MESSAGES_BY_LOCALE,
  loadLocaleMessages,
  getNestedValue,
  translate,
};

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
    if (newLocale !== 'vi') {
      loadLocaleMessages(newLocale).then(() => {
        setLocaleState(newLocale);
      });
    } else {
      setLocaleState(newLocale);
    }
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      document.cookie = `${LOCALE_STORAGE_KEY}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Inaccessible storage
    }
  };

  useEffect(() => {
    if (locale !== 'vi' && (!MESSAGES_BY_LOCALE[locale] || Object.keys(MESSAGES_BY_LOCALE[locale]).length === 0)) {
      loadLocaleMessages(locale).then(() => {
        setLocaleState(locale);
      });
    }
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
