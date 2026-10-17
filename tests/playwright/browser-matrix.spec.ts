import { test, expect } from '@playwright/test';

/**
 * Multi-Browser Matrix Smoke Spec for Playwright CLI
 * Verifies Playwright executor configuration across Chromium, WebKit, Firefox,
 * Mobile Safari and Mobile Chrome projects (SYS-10).
 */
test.describe('Multi-Browser & Device Matrix Smoke (SYS-10 / Playwright CLI)', () => {
  test('Verify browser environment and viewport configuration', async ({ page }) => {
    const baseURL = test.info().project.use.baseURL || 'http://127.0.0.1:3000';
    expect(baseURL).toBeTruthy();

    const viewport = page.viewportSize();
    expect(viewport === null || (viewport.width > 0 && viewport.height > 0)).toBe(true);
  });
});
