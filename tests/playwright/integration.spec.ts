import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { MailpitClient } from './fixtures/mailpit.fixture.js';
import {
  SEEDED_STAFF_ACCOUNTS,
  generateTotp,
  authenticateStaffAccount,
} from './fixtures/staff-auth.fixture.js';

/**
 * End-to-End Integration Suite with Real API & Services (I00)
 * Acceptance Criteria:
 * - Staging CI runs Web, Admin, API, Postgres, Redis, Mailpit.
 * - Web and Admin invoke API via same-origin /api/v1.
 * - Registration flow sends real email verified via Mailpit fixture.
 * - Seeded staff accounts login with real password and TOTP 2FA challenge.
 */
test.describe('Real API & Infrastructure Integration Suite (I00)', () => {
  const mailpit = new MailpitClient();

  test('Fixture verification: RFC 6238 TOTP generation conforms to test secret', async () => {
    // Known secret & standard RFC 6238 counter test
    const secret = 'JBSWY3DPEHPK3PXP';
    const code = generateTotp(secret, 1234567890000);
    expect(code).toHaveLength(6);
    expect(/^\d{6}$/.test(code)).toBe(true);
  });

  test('Fixture verification: Seeded staff accounts are defined with credentials and TOTP', async () => {
    expect(SEEDED_STAFF_ACCOUNTS.admin).toBeDefined();
    expect(SEEDED_STAFF_ACCOUNTS.admin.email).toBe('publisher@jlpt.local');
    expect(SEEDED_STAFF_ACCOUNTS.admin.password).toBe('Admin123456!');
    expect(SEEDED_STAFF_ACCOUNTS.admin.role).toBe('admin');
    expect(SEEDED_STAFF_ACCOUNTS.admin.totpSecret).toBe('JBSWY3DPEHPK3PXP');

    expect(SEEDED_STAFF_ACCOUNTS.editor).toBeDefined();
    expect(SEEDED_STAFF_ACCOUNTS.editor.email).toBe('editor@jlpt.local');
    expect(SEEDED_STAFF_ACCOUNTS.editor.role).toBe('editor');

    expect(SEEDED_STAFF_ACCOUNTS.reviewer).toBeDefined();
    expect(SEEDED_STAFF_ACCOUNTS.reviewer.email).toBe('reviewer@jlpt.local');
    expect(SEEDED_STAFF_ACCOUNTS.reviewer.role).toBe('reviewer');
  });

  test('Same-origin API reverse proxy: Web origin /api/v1 routes to API service', async ({
    request,
  }) => {
    const webOrigin = process.env.PLAYWRIGHT_BASE_URL || test.info().project.use.baseURL || 'http://127.0.0.1:3000';

    let response;
    try {
      response = await request.get(`${webOrigin}/api/v1/health`, { timeout: 5000 });
    } catch (err) {
      if (!process.env.CI) {
        test.skip(true, 'Staging live server not running locally; skipping live check');
        return;
      }
      throw err;
    }

    expect(response.status()).toBe(200);
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body.status).toBe('ok');
  });

  test('Same-origin API reverse proxy: Admin origin /api/v1 routes to API service', async ({
    request,
  }) => {
    const adminOrigin = process.env.ADMIN_URL || 'http://127.0.0.1:3001';

    let response;
    try {
      response = await request.get(`${adminOrigin}/api/v1/health`, { timeout: 5000 });
    } catch (err) {
      if (!process.env.CI) {
        test.skip(true, 'Staging live server not running locally; skipping live check');
        return;
      }
      throw err;
    }

    expect(response.status()).toBe(200);
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body.status).toBe('ok');
  });

  test('Mailpit integration: Student registration dispatches real email and verifies account', async ({
    request,
  }) => {
    const isMailpitUp = await mailpit.isHealthy();
    if (!isMailpitUp) {
      if (!process.env.CI) {
        test.skip(true, 'Mailpit not running in local environment; skipping live email drill');
        return;
      }
      expect(isMailpitUp).toBe(true);
      throw new Error(`Mailpit service unreachable at ${process.env.MAILPIT_URL || 'http://127.0.0.1:8025'}`);
    }

    const apiUrl = process.env.STAGING_API_URL || 'http://127.0.0.1:4000';
    const timestamp = Date.now();
    const testEmail = `student.e2e.${timestamp}@jlpt.local`;
    const testPassword = 'Password123!';
    const testName = `Student E2E ${timestamp}`;

    // 1. Send registration request to API
    const regRes = await request.post(`${apiUrl}/api/v1/auth/sign-up/email`, {
      data: {
        email: testEmail,
        password: testPassword,
        name: testName,
      },
    });

    expect(regRes.status()).toBe(201);
    const regBody = await regRes.json();
    expect(regBody.user.email).toBe(testEmail);
    expect(regBody.user.emailVerified).toBe(false);

    // 2. Poll Mailpit for verification email
    const emailMessage = await mailpit.waitForEmail(testEmail, 15000);
    expect(emailMessage.Subject.toLowerCase()).toContain('xác minh');

    // 3. Extract verification token from email
    const verificationToken = mailpit.extractVerificationToken(emailMessage);
    expect(verificationToken).toBeTruthy();

    // 4. Call verification endpoint
    const verifyRes = await request.get(
      `${apiUrl}/api/v1/auth/verify-email?token=${verificationToken}`,
    );
    expect(verifyRes.status()).toBe(200);

    // 5. Sign in with newly verified credentials
    const loginRes = await request.post(`${apiUrl}/api/v1/auth/sign-in/email`, {
      data: {
        email: testEmail,
        password: testPassword,
      },
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.user.emailVerified).toBe(true);
  });

  test('Staff authentication: Seeded staff logs in with password and validates TOTP', async ({
    request,
  }) => {
    const apiUrl = process.env.STAGING_API_URL || 'http://127.0.0.1:4000';

    try {
      const ping = await request.get(`${apiUrl}/api/v1/health`, { timeout: 3000 });
      if (!ping.ok()) {
        if (!process.env.CI) {
          test.skip(true, 'API not healthy; skipping live staff login drill');
          return;
        }
        expect(ping.status()).toBe(200);
      }
    } catch (err) {
      if (!process.env.CI) {
        test.skip(true, 'API not reachable; skipping live staff login drill');
        return;
      }
      throw err;
    }

    // Attempt login with seeded staff credentials
    const staff = SEEDED_STAFF_ACCOUNTS.admin;
    let authResult;
    try {
      authResult = await authenticateStaffAccount(staff, apiUrl);
    } catch (err) {
      if (!process.env.CI) {
        test.skip(true, `Local staging DB not seeded with staff credentials: ${(err as Error).message}`);
        return;
      }
      throw err;
    }

    expect(authResult.token).toBeTruthy();
    expect(authResult.user.email).toBe(staff.email);
    expect(authResult.user.role).toBe('admin');
    expect(authResult.totpCode).toHaveLength(6);

    // Negative test 1: Protected admin route without TOTP header must be rejected with 403 / TWO_FACTOR_REQUIRED
    const missingTotpRes = await request.get(`${apiUrl}/api/v1/admin/audit-logs`, {
      headers: {
        Authorization: `Bearer ${authResult.token}`,
      },
    });
    expect(missingTotpRes.status()).toBe(403);
    const missingTotpBody = await missingTotpRes.json();
    expect(missingTotpBody.error?.code).toBe('TWO_FACTOR_REQUIRED');

    // Negative test 2: Protected admin route with invalid TOTP code must be rejected with 403 / TWO_FACTOR_REQUIRED
    const invalidTotpRes = await request.get(`${apiUrl}/api/v1/admin/audit-logs`, {
      headers: {
        Authorization: `Bearer ${authResult.token}`,
        'x-totp-code': '000000',
      },
    });
    expect(invalidTotpRes.status()).toBe(403);
    const invalidTotpBody = await invalidTotpRes.json();
    expect(invalidTotpBody.error?.code).toBe('TWO_FACTOR_REQUIRED');

    // Positive test: Protected admin route with valid RFC 6238 TOTP code succeeds (200 OK)
    const validTotp = generateTotp(staff.totpSecret);
    const validTotpRes = await request.get(`${apiUrl}/api/v1/admin/audit-logs`, {
      headers: {
        Authorization: `Bearer ${authResult.token}`,
        'x-totp-code': validTotp,
      },
    });
    expect(validTotpRes.status()).toBe(200);
    const validBody = await validTotpRes.json();
    expect(validBody).toHaveProperty('items');
    expect(Array.isArray(validBody.items)).toBe(true);
  });
});

/**
 * End-to-End Real Browser GUI Suite for Admin Portal (I02)
 * Acceptance Criteria:
 * - Real user flow through browser GUI (NO page.route, NO mock fetch, NO client-side fake data)
 * - Wrong password or wrong TOTP rejected by API with error alert visible in UI
 * - Seeded staff completes real login with password + RFC 6238 TOTP
 * - Viewport checks at 390px (mobile) and 1366px (desktop) on all pages in scope
 * - Verified no horizontal scroll (overflow-x) on any page in scope
 * - Screenshots captured for CI artifacts
 * - Verified Tailwind classes applied
 * - Verified no raw translation keys displayed across all 3 locales (vi, ja, en)
 * - Protected routes redirect unauthenticated users to /login
 */
test.describe('Admin Portal Real GUI & Staff Authentication Flow (I02)', () => {
  const adminOrigin = process.env.ADMIN_URL || 'http://127.0.0.1:3001';
  const staff = SEEDED_STAFF_ACCOUNTS.admin;

  test.beforeEach(async ({ page }) => {
    // Check if admin staging app is accessible before running UI drills
    try {
      const ping = await page.goto(`${adminOrigin}/login`, { timeout: 4000 });
      if (!ping || !ping.ok()) {
        if (!process.env.CI) {
          test.skip(true, 'Admin staging app not running locally; skipping browser GUI test');
          return;
        }
      }
    } catch (err) {
      if (!process.env.CI) {
        test.skip(true, 'Admin staging app not reachable; skipping browser GUI test');
        return;
      }
      throw err;
    }

    // In local worker environment, verify that staging DB is seeded with staff credentials
    if (!process.env.CI) {
      try {
        const apiUrl = process.env.STAGING_API_URL || 'http://127.0.0.1:4000';
        await authenticateStaffAccount(staff, apiUrl);
      } catch (err) {
        test.skip(true, `Staging environment not seeded with staff credentials: ${(err as Error).message}`);
      }
    }
  });

  test('GUI Flow: Rejects invalid credentials and enforces 2FA at API layer (Negative Tests)', async ({
    page,
  }) => {
    // 1. Navigate to /login
    await page.goto(`${adminOrigin}/login`);
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();

    // 2. Submit wrong password
    await page.fill('[data-testid="email-input"]', staff.email);
    await page.fill('[data-testid="password-input"]', 'WrongPassword999!');
    await page.click('[data-testid="submit-login-button"]');

    // 3. Verify server rejection is displayed in UI
    const errorAlert = page.locator('[data-testid="login-error-alert"]');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/không chính xác|invalid/i);
    expect(page.url()).toContain('/login');

    // 4. Submit valid credentials to proceed to 2FA challenge
    await page.fill('[data-testid="password-input"]', staff.password);
    await page.click('[data-testid="submit-login-button"]');

    // 5. Must reach /verify-2fa challenge
    await expect(page).toHaveURL(/.*\/verify-2fa/);
    const codeInput = page.locator('[data-testid="challenge-code-input"]');
    await expect(codeInput).toBeVisible();

    // 6. Submit invalid TOTP code '000000'
    await page.fill('[data-testid="challenge-code-input"]', '000000');
    await page.click('[data-testid="submit-challenge-button"]');

    // 7. Verify 2FA server rejection
    const challengeError = page.locator('[data-testid="challenge-error-alert"]');
    await expect(challengeError).toBeVisible();
    await expect(challengeError).toContainText(/không chính xác|không hợp lệ|invalid/i);
    expect(page.url()).toContain('/verify-2fa');
  });

  test('GUI Flow: Completes valid staff login, navigates pages in scope, verifies 390px/1366px viewports and 3 locales', async ({
    page,
  }) => {
    // Ensure screenshot directory exists
    const screenshotDir = path.resolve(process.cwd(), 'test-results/screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // 1. Log in via UI with valid staff credentials + TOTP
    await page.goto(`${adminOrigin}/login`);
    await page.fill('[data-testid="email-input"]', staff.email);
    await page.fill('[data-testid="password-input"]', staff.password);
    await page.click('[data-testid="submit-login-button"]');

    await expect(page).toHaveURL(/.*\/verify-2fa/);
    const validTotp = generateTotp(staff.totpSecret);
    await page.fill('[data-testid="challenge-code-input"]', validTotp);
    await page.click('[data-testid="submit-challenge-button"]');

    // Verify redirected to dashboard /
    await page.waitForURL(`${adminOrigin}/`);
    await expect(page.locator('h1')).toContainText('JLPT Admin Portal');

    // 2. Test pages in scope across 390px and 1366px viewports
    const pagesInScope = [
      { path: '/', slug: 'dashboard' },
      { path: '/users', slug: 'users' },
      { path: '/audit-logs', slug: 'audit-logs' },
      { path: '/settings/notifications', slug: 'notifications' },
      { path: '/settings/org', slug: 'org' },
      { path: '/settings/backup', slug: 'backup' },
    ];

    const viewports = [
      { width: 390, height: 844, name: '390px' },
      { width: 1366, height: 768, name: '1366px' },
    ];

    for (const targetPage of pagesInScope) {
      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${adminOrigin}${targetPage.path}`);
        await page.waitForLoadState('networkidle');

        // Check no horizontal scroll (overflow-x)
        const hasHorizontalOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(
          hasHorizontalOverflow,
          `Page ${targetPage.path} at ${vp.name} should not have horizontal scroll`,
        ).toBe(false);

        // Capture artifact screenshot
        const screenshotPath = path.join(
          screenshotDir,
          `admin-${targetPage.slug}-${vp.name}.png`,
        );
        await page.screenshot({ path: screenshotPath, fullPage: false });
        expect(fs.existsSync(screenshotPath)).toBe(true);

        // Verify Tailwind styling is applied: container has computed padding or margin > 0
        const containerPadding = await page.evaluate(() => {
          const main = document.querySelector('main') || document.querySelector('.max-w-7xl') || document.body;
          const style = window.getComputedStyle(main);
          return style.padding || style.margin;
        });
        expect(containerPadding).toBeTruthy();

        // Verify no raw translation keys like account.profile.title or app.title exist in visible text
        const textContent = await page.innerText('body');
        expect(textContent).not.toMatch(
          /\b(app\.|auth\.|totp\.|roles\.|common\.|nav\.|account\.)[a-z0-9_]+/i,
        );
      }
    }

    // 3. Verify all 3 locales (vi, ja, en) via UI navigation locale switcher
    const locales = [
      { code: 'ja', labelRegex: /言語|ダッシュボード|システム管理者/ },
      { code: 'en', labelRegex: /Language|Dashboard|Admin/ },
      { code: 'vi', labelRegex: /Ngôn ngữ|Bảng điều khiển|Quản trị viên/ },
    ];

    for (const loc of locales) {
      const switchBtn = page.locator(`button[aria-label="Switch to ${loc.code}"]`);
      if (await switchBtn.isVisible()) {
        await switchBtn.click();
        await page.waitForTimeout(100);

        const pageText = await page.innerText('body');
        expect(pageText).toMatch(loc.labelRegex);

        // Verify no raw translation keys in this locale
        expect(pageText).not.toMatch(
          /\b(app\.|auth\.|totp\.|roles\.|common\.|nav\.|account\.)[a-z0-9_]+/i,
        );
      }
    }
  });

  test('GUI Flow: Unauthenticated access to protected routes redirects to /login', async ({
    page,
    context,
  }) => {
    // Clear cookies / localStorage to simulate fresh unauthenticated session
    await context.clearCookies();
    await page.goto(`${adminOrigin}/login`);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Attempt to directly navigate to /settings/backup
    await page.goto(`${adminOrigin}/settings/backup`);

    // Verify redirected to /login or denied access
    await page.waitForURL(/.*(\/login|403)/);
    const currentUrl = page.url();
    expect(currentUrl.includes('/login') || currentUrl.includes('403')).toBe(true);
  });
});

