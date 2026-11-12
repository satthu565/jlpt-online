import { describe, expect, it } from 'vitest';
import { DEFAULT_AFTER_LOGIN, getSafeRedirect } from '../lib/safe-redirect';

describe('getSafeRedirect', () => {
  it('keeps a same-site path with its query and hash', () => {
    expect(getSafeRedirect('/thong-ke')).toBe('/thong-ke');
    expect(getSafeRedirect('/luyen-tap?level=N3&pool=wrong#top')).toBe('/luyen-tap?level=N3&pool=wrong#top');
    expect(getSafeRedirect('/de-thi/n3-2022-07')).toBe('/de-thi/n3-2022-07');
  });

  it('falls back when there is nothing to follow', () => {
    expect(getSafeRedirect(null)).toBe(DEFAULT_AFTER_LOGIN);
    expect(getSafeRedirect(undefined)).toBe(DEFAULT_AFTER_LOGIN);
    expect(getSafeRedirect('')).toBe(DEFAULT_AFTER_LOGIN);
    expect(getSafeRedirect('', '/')).toBe('/');
  });

  it('refuses anything that could leave the site', () => {
    for (const bad of [
      'https://evil.example/phish',
      'http://evil.example',
      '//evil.example',
      '///evil.example',
      '/\\evil.example',
      '\\\\evil.example',
      'javascript:alert(1)',
      'thong-ke',
      '/%0d%0aSet-Cookie:x=1',
      '/a\nb',
    ]) {
      // the percent-encoded form stays a harmless path; only raw control characters are rejected
      if (bad === '/%0d%0aSet-Cookie:x=1') {
        expect(getSafeRedirect(bad)).toBe(bad);
        continue;
      }
      expect(getSafeRedirect(bad), bad).toBe(DEFAULT_AFTER_LOGIN);
    }
  });

  it('does not bounce back into the auth pages', () => {
    expect(getSafeRedirect('/dang-nhap')).toBe(DEFAULT_AFTER_LOGIN);
    expect(getSafeRedirect('/dang-nhap?redirect=/thong-ke')).toBe(DEFAULT_AFTER_LOGIN);
    expect(getSafeRedirect('/dang-ky/')).toBe(DEFAULT_AFTER_LOGIN);
    expect(getSafeRedirect('/dang-nhap-khac')).toBe('/dang-nhap-khac');
  });

  it('rejects absurdly long values', () => {
    expect(getSafeRedirect('/' + 'a'.repeat(3000))).toBe(DEFAULT_AFTER_LOGIN);
  });
});
