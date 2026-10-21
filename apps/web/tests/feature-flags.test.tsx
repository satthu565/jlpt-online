import { describe, expect, it } from 'vitest';
import { FEATURES } from '../lib/features';
import sitemap from '../app/sitemap';
import PrivacyPolicyPage from '../app/(info)/chinh-sach/page';

// Release phase (2026-10-21): privacy policy page, TTS and AI answer explanation are hidden by default.
describe('features hidden in this release phase', () => {
  it('are off unless their NEXT_PUBLIC_FEATURE_* variable is 1', () => {
    expect(FEATURES).toEqual({ privacyPolicyPage: false, tts: false, aiExplanation: false });
  });

  it('removes the privacy policy page: 404 and no sitemap entry', async () => {
    expect(() => PrivacyPolicyPage()).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls.some((u) => u.endsWith('/chinh-sach'))).toBe(false);
  });
});
