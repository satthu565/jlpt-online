import { createRequire } from 'node:module';
import viMessages from '../messages/vi.json' with { type: 'json' };

export type Locale = 'vi' | 'ja' | 'en';

export const DEFAULT_LOCALE: Locale = 'vi';
export const SUPPORTED_LOCALES: readonly Locale[] = ['vi', 'ja', 'en'] as const;

export const LOCALE_STORAGE_KEY = 'jlpt_locale';

export type MessageTree = Record<string, unknown>;

let jaMessages: MessageTree = {};
let enMessages: MessageTree = {};

// In Node.js / SSR / Vitest environment, load non-default locales synchronously
if (typeof window === 'undefined') {
  try {
    const req = createRequire(import.meta.url);
    jaMessages = (req('../messages/ja.json') as MessageTree) || {};
    enMessages = (req('../messages/en.json') as MessageTree) || {};
  } catch {
    // Stubs in browser or bundler
  }
}

export const MESSAGES_BY_LOCALE: Record<Locale, MessageTree> = {
  vi: viMessages as MessageTree,
  ja: jaMessages,
  en: enMessages,
};

export async function loadLocaleMessages(locale: Locale): Promise<MessageTree> {
  if (locale === 'vi') return viMessages as MessageTree;
  if (MESSAGES_BY_LOCALE[locale] && Object.keys(MESSAGES_BY_LOCALE[locale]).length > 0) {
    return MESSAGES_BY_LOCALE[locale];
  }
  if (locale === 'ja') {
    const mod = await import('../messages/ja.json');
    MESSAGES_BY_LOCALE.ja = ((mod as { default?: MessageTree }).default || mod) as MessageTree;
    return MESSAGES_BY_LOCALE.ja;
  }
  if (locale === 'en') {
    const mod = await import('../messages/en.json');
    MESSAGES_BY_LOCALE.en = ((mod as { default?: MessageTree }).default || mod) as MessageTree;
    return MESSAGES_BY_LOCALE.en;
  }
  return viMessages as MessageTree;
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
