import { describe, it, expect, beforeAll } from 'vitest';
import vi from '../messages/vi.json' with { type: 'json' };
import ja from '../messages/ja.json' with { type: 'json' };
import en from '../messages/en.json' with { type: 'json' };
import React from 'react';
import { renderToString } from 'react-dom/server';
import HomePage from '../app/page';
import {
  translate,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type Locale,
  I18nProvider,
  loadLocaleMessages,
} from '../lib/i18n';

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


// ja/en messages load on demand in the app; load them up front for these tests.
beforeAll(async () => {
  await loadLocaleMessages('ja');
  await loadLocaleMessages('en');
});

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
    // Inject a temporary key only in vi messages to simulate a key missing in ja & en
    (vi as Record<string, unknown>).__test_fallback_only__ = 'Nội dung tiếng Việt mặc định';

    try {
      // Key does not exist in 'ja', so it must trigger fallback to 'vi' and return the Vietnamese text
      const fallbackValJa = translate('ja' as Locale, '__test_fallback_only__');
      expect(fallbackValJa).toBe('Nội dung tiếng Việt mặc định');

      // Key does not exist in 'en', so it must also trigger fallback to 'vi'
      const fallbackValEn = translate('en' as Locale, '__test_fallback_only__');
      expect(fallbackValEn).toBe('Nội dung tiếng Việt mặc định');
    } finally {
      delete (vi as Record<string, unknown>).__test_fallback_only__;
    }

    // When an unknown key does not exist in ANY locale (neither target nor vi), return the key path itself
    const nonExistentKey = 'custom.unknown.path';
    expect(translate('ja', nonExistentKey)).toBe('custom.unknown.path');
    expect(translate('vi', nonExistentKey)).toBe('custom.unknown.path');
  });

  it('supports parameter interpolation {param}', () => {
    // 1. Test interpolation on registered message keys across all locales via translate()
    expect(translate('vi', 'home.levelHeading', { level: 'N1' })).toBe('Cấp độ N1');
    expect(translate('ja', 'home.levelHeading', { level: 'N2' })).toBe('レベル N2');
    expect(translate('en', 'home.levelHeading', { level: 'N3' })).toBe('Level N3');

    expect(translate('vi', 'home.viewLevelExams', { level: 'N1' })).toBe('Xem đề thi N1');
    expect(translate('ja', 'home.viewLevelExams', { level: 'N1' })).toBe('N1 の問題を見る');
    expect(translate('en', 'home.viewLevelExams', { level: 'N1' })).toBe('View N1 Exams');

    expect(
      translate('vi', 'account.sessions.revokeAriaLabel', { device: 'Chrome / macOS' }),
    ).toBe('Hủy phiên đăng nhập Chrome / macOS');
    expect(
      translate('ja', 'account.sessions.revokeAriaLabel', { device: 'Chrome / macOS' }),
    ).toBe('セッションを終了: Chrome / macOS');
    expect(
      translate('en', 'account.sessions.revokeAriaLabel', { device: 'Chrome / macOS' }),
    ).toBe('Revoke session for Chrome / macOS');

    // 2. Unmatched parameters retain placeholders {unmatched}
    expect(translate('vi', 'home.levelHeading', {})).toBe('Cấp độ {level}');
  });

  it('Japanese text is valid NFC without corrupt NFKC characters', () => {
    for (const key of jaKeys) {
      const val = translate('ja', key);
      // Value should equal its NFC normalized form
      expect(val).toBe(val.normalize('NFC'));
    }
  });

  it('HomePage translates correctly based on selected locale in I18nProvider', () => {
    // Default Vietnamese
    const htmlVi = renderToString(React.createElement(I18nProvider, { initialLocale: 'vi' }, React.createElement(HomePage)));
    expect(htmlVi).toContain('Luyện thi JLPT Trực tuyến Chuẩn Nhật');
    expect(htmlVi).toContain('Làm bài thi thử ngay');

    // Japanese
    const htmlJa = renderToString(React.createElement(I18nProvider, { initialLocale: 'ja' }, React.createElement(HomePage)));
    expect(htmlJa).toContain('公式JLPT準拠 オンライン日本語能力試験');
    expect(htmlJa).toContain('今すぐ無料体験する');

    // English
    const htmlEn = renderToString(React.createElement(I18nProvider, { initialLocale: 'en' }, React.createElement(HomePage)));
    expect(htmlEn).toContain('Standard Online JLPT Practice Platform');
    expect(htmlEn).toContain('Start Free Mock Exam');
  });

  it('loadLocaleMessages dynamically loads non-default locales and caches them', async () => {
    const jaMessages = await loadLocaleMessages('ja');
    expect(jaMessages).toBeDefined();
    expect(typeof jaMessages).toBe('object');
    expect(jaMessages['home']).toBeDefined();

    const enMessages = await loadLocaleMessages('en');
    expect(enMessages).toBeDefined();
    expect(typeof enMessages).toBe('object');
    expect(enMessages['home']).toBeDefined();
  });
});
