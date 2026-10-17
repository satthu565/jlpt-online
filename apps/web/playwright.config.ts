import { defineConfig } from '@playwright/test';

/**
 * Playwright E2E configuration for @jlpt/web
 * Focuses on user-journey testing across real API, Mailpit, and Viewports.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts/,
  testIgnore: ['**/tests/**', '**/*.test.ts', '**/*.test.tsx'],
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',
    extraHTTPHeaders: {
      'x-forwarded-for': '198.51.100.80',
      'cf-connecting-ip': '198.51.100.80',
    },
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-1366',
      use: {
        viewport: { width: 1366, height: 768 },
      },
    },
    {
      name: 'mobile-390',
      use: {
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
