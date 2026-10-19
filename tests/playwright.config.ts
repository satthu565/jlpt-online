import { defineConfig, devices } from '@playwright/test';

/**
 * JLPT Online - Multi-Browser End-to-End Test Configuration
 * Browsers: Chromium, WebKit (Safari), Firefox
 * Mobile Devices: iPhone (Mobile Safari), Android (Mobile Chrome)
 * Feature: SYS-10, SYS-14 (A11y), Device Matrix T1.9.4
 */
export default defineConfig({
  testDir: './playwright',
  testMatch: /.*\.spec\.ts/,
  testIgnore: ['**/e2e/**', '**/*.test.ts', '**/*.test.tsx'],
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [
    ['list'],
    ['json', { outputFile: '../docs/release/playwright-report.json' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',
    extraHTTPHeaders: {
      'x-forwarded-for': '198.51.100.80',
      'cf-connecting-ip': '198.51.100.80',
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // 1. Desktop Chromium (Desktop Chrome / Edge)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    // 2. Desktop Firefox (Gecko Engine)
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    // 3. Desktop WebKit (macOS Safari)
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 900 },
      },
    },
    // 4. Mobile Safari (iPhone 15 / iOS)
    {
      name: 'Mobile Safari (iPhone 15)',
      use: {
        ...devices['iPhone 15'],
        hasTouch: true,
        isMobile: true,
      },
    },
    // 5. Mobile Chrome (Pixel 7 / Android)
    {
      name: 'Mobile Chrome (Pixel 7)',
      use: {
        ...devices['Pixel 7'],
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
});
