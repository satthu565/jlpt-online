import viMessages from '../messages/vi.json';
import jaMessages from '../messages/ja.json';
import enMessages from '../messages/en.json';

export type Locale = 'vi' | 'ja' | 'en';

export const SUPPORTED_LOCALES: Locale[] = ['vi', 'ja', 'en'];
export const DEFAULT_LOCALE: Locale = 'vi';

export const messages: Record<Locale, typeof viMessages> = {
  vi: viMessages,
  ja: jaMessages as typeof viMessages,
  en: enMessages as typeof viMessages,
};

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T & (string | number)]: T[K] extends object
        ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
        : `${K}`;
    }[keyof T & (string | number)]
  : never;

export type TranslationKey = NestedKeyOf<typeof viMessages>;

/**
 * Resolves a nested translation key (e.g. 'nav.dashboard') from message dictionaries.
 */
export function getTranslation(key: string, locale: Locale = DEFAULT_LOCALE): string {
  const dict = messages[locale] ?? messages[DEFAULT_LOCALE];
  const parts = key.split('.');

  let current: unknown = dict;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      // Fallback to Vietnamese if not found
      let fallbackCurrent: unknown = messages[DEFAULT_LOCALE];
      for (const fPart of parts) {
        if (fallbackCurrent && typeof fallbackCurrent === 'object' && fPart in fallbackCurrent) {
          fallbackCurrent = (fallbackCurrent as Record<string, unknown>)[fPart];
        } else {
          return key;
        }
      }
      return typeof fallbackCurrent === 'string' ? fallbackCurrent : key;
    }
  }

  return typeof current === 'string' ? current : key;
}

export function t(key: string, locale: Locale = DEFAULT_LOCALE): string {
  return getTranslation(key, locale);
}
