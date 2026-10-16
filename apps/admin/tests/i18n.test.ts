import { describe, it, expect } from 'vitest';
import vi from '../messages/vi.json';
import ja from '../messages/ja.json';
import en from '../messages/en.json';
import { t, getTranslation, SUPPORTED_LOCALES } from '../lib/i18n';

function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(getAllKeys(v as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

function getAllStrings(obj: Record<string, unknown>): string[] {
  let strings: string[] = [];
  for (const v of Object.values(obj)) {
    if (typeof v === 'string') {
      strings.push(v);
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      strings = strings.concat(getAllStrings(v as Record<string, unknown>));
    }
  }
  return strings;
}

describe('Admin Internationalization & Japanese NFC Normalization', () => {
  it('supports vi, ja, and en locales', () => {
    expect(SUPPORTED_LOCALES).toEqual(['vi', 'ja', 'en']);
  });

  it('guarantees complete symmetry between vi, ja, and en message keys', () => {
    const viKeys = getAllKeys(vi as Record<string, unknown>);
    const jaKeys = getAllKeys(ja as Record<string, unknown>);
    const enKeys = getAllKeys(en as Record<string, unknown>);

    expect(viKeys.length).toBeGreaterThan(30);
    expect(jaKeys).toEqual(viKeys);
    expect(enKeys).toEqual(viKeys);
  });

  it('guarantees all Japanese strings are strictly Unicode NFC normalized', () => {
    const jaStrings = getAllStrings(ja as Record<string, unknown>);

    for (const str of jaStrings) {
      const nfc = str.normalize('NFC');
      expect(str).toBe(nfc);
    }
  });

  it('resolves translations accurately and falls back safely', () => {
    expect(t('nav.dashboard', 'vi')).toBe('Bảng điều khiển');
    expect(t('nav.dashboard', 'ja')).toBe('ダッシュボード');
    expect(t('nav.dashboard', 'en')).toBe('Dashboard');

    expect(t('auth.loginTitle', 'vi')).toBe('Đăng nhập nhân sự');
    expect(t('auth.loginTitle', 'ja')).toBe('スタッフログイン');
    expect(t('auth.loginTitle', 'en')).toBe('Staff Sign In');

    // Missing key returns the key itself as safe fallback
    expect(getTranslation('nonexistent.nested.key', 'vi')).toBe('nonexistent.nested.key');
  });
});
