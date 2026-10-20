import viMessages from '../messages/vi.json';

export type Locale = 'vi' | 'ja' | 'en';

export const SUPPORTED_LOCALES: Locale[] = ['vi', 'ja', 'en'];
export const DEFAULT_LOCALE: Locale = 'vi';

// Only Vietnamese ships with every page; ja/en (~11 KB gzip) load when chosen. Missing keys fall back to vi.
export const messages: Record<Locale, typeof viMessages> = {
  vi: viMessages,
  ja: {} as typeof viMessages,
  en: {} as typeof viMessages,
};

export function isLocaleLoaded(locale: Locale): boolean {
  return Object.keys(messages[locale] ?? {}).length > 0;
}

/** Installs a locale's messages (used by loadLocaleMessages and by the test setup). */
export function registerLocaleMessages(locale: Locale, dict: unknown): void {
  if (!isLocaleLoaded(locale)) messages[locale] = dict as typeof viMessages;
}

const LOCALE_LOADERS: Record<Exclude<Locale, 'vi'>, () => Promise<{ default: unknown }>> = {
  ja: () => import('../messages/ja.json'),
  en: () => import('../messages/en.json'),
};

export async function loadLocaleMessages(locale: Locale): Promise<void> {
  if (locale === 'vi' || isLocaleLoaded(locale)) return;
  const mod = await LOCALE_LOADERS[locale]();
  registerLocaleMessages(locale, mod.default ?? mod);
}

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
