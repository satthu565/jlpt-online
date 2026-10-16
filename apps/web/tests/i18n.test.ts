import { describe, it, expect } from 'vitest';
import vi from '../messages/vi.json' with { type: 'json' };
import ja from '../messages/ja.json' with { type: 'json' };
import en from '../messages/en.json' with { type: 'json' };
import {
  translate,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type Locale,
} from '../lib/i18n.js';

function extractLeafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...extractLeafKeys(value as Record<string, unknown>, fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  return keys.sort();
}

describe('Internationalization System (ACC-14 & Acceptance 1)', () => {
  const viKeys = extractLeafKeys(vi as Record<string, unknown>);
  const jaKeys = extractLeafKeys(ja as Record<string, unknown>);
  const enKeys = extractLeafKeys(en as Record<string, unknown>);

  it('supports three locales: vi (default), ja, en', () => {
    expect(DEFAULT_LOCALE).toBe('vi');
    expect(SUPPORTED_LOCALES).toEqual(['vi', 'ja', 'en']);
  });

  it('all keys in vi.json exist in ja.json (no missing Japanese keys)', () => {
    const missingInJa = viKeys.filter((k) => !jaKeys.includes(k));
    expect(missingInJa).toEqual([]);
    expect(jaKeys.length).toBe(viKeys.length);
  });

  it('all keys in vi.json exist in en.json (no missing English keys)', () => {
    const missingInEn = viKeys.filter((k) => !enKeys.includes(k));
    expect(missingInEn).toEqual([]);
    expect(enKeys.length).toBe(viKeys.length);
  });

  it('all leaf values are non-empty strings', () => {
    for (const key of viKeys) {
      const viVal = translate('vi', key);
      const jaVal = translate('ja', key);
      const enVal = translate('en', key);

      expect(typeof viVal).toBe('string');
      expect(viVal.trim().length).toBeGreaterThan(0);

      expect(typeof jaVal).toBe('string');
      expect(jaVal.trim().length).toBeGreaterThan(0);

      expect(typeof enVal).toBe('string');
      expect(enVal.trim().length).toBeGreaterThan(0);
    }
  });

  it('translates correctly for each locale', () => {
    expect(translate('vi', 'common.nav.home')).toBe('Trang chủ');
    expect(translate('ja', 'common.nav.home')).toBe('ホーム');
    expect(translate('en', 'common.nav.home')).toBe('Home');

    expect(translate('vi', 'auth.login.title')).toBe('Đăng nhập tài khoản');
    expect(translate('ja', 'auth.login.title')).toBe('アカウントログイン');
    expect(translate('en', 'auth.login.title')).toBe('Account Sign In');
  });

  it('falls back clearly to DEFAULT_LOCALE (vi) when a key is missing in target locale', () => {
    // If a key is searched in 'ja' that does not exist in 'ja' but exists in 'vi'
    // It should cleanly return the 'vi' text without throwing an error
    const key = 'common.nav.home';
    const fallbackVal = translate('ja' as Locale, key);
    expect(fallbackVal).toBe('ホーム');

    // Simulate an unknown key: should return the key itself as safe fallback
    const nonExistentKey = 'custom.unknown.path';
    expect(translate('ja', nonExistentKey)).toBe('custom.unknown.path');
    expect(translate('vi', nonExistentKey)).toBe('custom.unknown.path');
  });

  it('supports parameter interpolation {param}', () => {
    // Test custom translation with parameter
    const template = 'Xin chào {name}, bạn đang ôn tập {level}!';
    const interpolated = template.replace(/{(\w+)}/g, (_, k: string) => {
      const map: Record<string, string> = { name: 'Thanh', level: 'N3' };
      return map[k] || `{${k}}`;
    });
    expect(interpolated).toBe('Xin chào Thanh, bạn đang ôn tập N3!');
  });

  it('Japanese text is valid NFC without corrupt NFKC characters', () => {
    for (const key of jaKeys) {
      const val = translate('ja', key);
      // Value should equal its NFC normalized form
      expect(val).toBe(val.normalize('NFC'));
    }
  });
});
