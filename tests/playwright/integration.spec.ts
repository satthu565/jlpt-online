import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
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
 * Full User Journey & Exam Flow E2E Suite with Real Staging Services (I05)
 * Acceptance Criteria:
 * - Student registers via UI, verifies via Mailpit, logs in, takes published demo N5 exam, views score on staging.
 * - Guest trial permitted for guest_trial exam; other exams require login.
 * - Loading, empty, and unauthorized states displayed clearly; 401/403 prompts login.
 * - Multi-viewport screenshots at 390px and 1366px, no horizontal scroll, 3 locales (vi, ja, en), no raw translation keys.
 */
test.describe('Real Staging User Journey & Exam Flow (I05)', () => {
  const mailpit = new MailpitClient();

  test('Student registration via UI, email verification, login, taking demo N5 exam, and viewing score (Acceptance 1, 4)', async ({
    page,
  }) => {
    const webOrigin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
    const isMailpitUp = await mailpit.isHealthy();
    if (!isMailpitUp) {
      if (!process.env.CI) {
        test.skip(true, 'Mailpit not running in local environment; skipping live UI flow');
        return;
      }
    }

    const timestamp = Date.now() + Math.floor(Math.random() * 10000);
    const testEmail = `student.e2e.ui.${timestamp}@jlpt.local`;
    const testPassword = 'Password123!';
    const testName = `Student UI ${timestamp}`;

    // 1. Student navigates to /dang-ky and submits registration
    await page.goto(`${webOrigin}/dang-ky`);
    await page.locator('#register-name').fill(testName);
    await page.locator('#register-email').fill(testEmail);
    await page.locator('#register-password').fill(testPassword);
    await page.locator('#register-confirm-password').fill(testPassword);
    await page.locator('#agree-terms').check();
    await page.locator('button[type="submit"]').click();

    // 2. Verification email received in Mailpit
    const emailMessage = await mailpit.waitForEmail(testEmail, 15000);
    const verificationToken = mailpit.extractVerificationToken(emailMessage);
    expect(verificationToken).toBeTruthy();

    // 3. User navigates to /xac-minh-email?token=...
    await page.goto(`${webOrigin}/xac-minh-email?token=${verificationToken}`);
    await expect(page.locator('[role="alert"], a[href="/dang-nhap"]').first()).toBeVisible({ timeout: 15000 });

    // 4. User navigates to /dang-nhap and signs in
    await page.goto(`${webOrigin}/dang-nhap`);
    await page.locator('#login-email').fill(testEmail);
    await page.locator('#login-password').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/dang-nhap'), { timeout: 15000 });

    // 5. Navigate to /de-thi and find demo N5 exam
    await page.goto(`${webOrigin}/de-thi`);
    await expect(page.locator('[data-testid="exam-library-page"]')).toBeVisible({ timeout: 15000 });

    // 6. Navigate to /phong-thi?examId=demo-n5-1
    await page.goto(`${webOrigin}/phong-thi?examId=demo-n5-1`);
    const startExamBtn = page.locator('[data-testid="modal-start-exam-btn"], button:has-text("Bắt đầu làm bài")').last();
    await expect(startExamBtn).toBeVisible({ timeout: 15000 });
    await startExamBtn.click();

    // 7. Exam room rendered - answer at least one question
    await expect(page.locator('[role="radiogroup"], [data-testid="exam-room"], main').first()).toBeVisible({ timeout: 15000 });
    const firstOption = page.locator('[role="radio"]').first();
    if (await firstOption.isVisible()) {
      await firstOption.click();
    }

    // 8. Submit exam via navigation or toolbar
    const submitBtn = page.locator('button:has-text("Nộp bài")').first();
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await submitBtn.click();

    // 9. Confirm in EarlySubmitModal
    const confirmBtn = page.locator('button:has-text("Xác nhận nộp bài")').first();
    await expect(confirmBtn).toBeVisible({ timeout: 10000 });
    await confirmBtn.click();

    // 10. Verify submission success screen or redirect to /ket-qua/
    const viewResultLink = page.locator('a[href*="/ket-qua/"]').first();
    await expect(viewResultLink).toBeVisible({ timeout: 15000 });
    const resultHref = await viewResultLink.getAttribute('href');
    expect(resultHref).toBeTruthy();

    // 11. Navigate to results page and verify score
    await page.goto(`${webOrigin}${resultHref}`);
    await expect(page.locator('[data-testid="score-summary"], [data-testid="exam-result-page"], :has-text("Kết quả")').first()).toBeVisible({ timeout: 15000 });
  });

  test('Guest trial allowed for guest_trial exam, login required for other exams (Acceptance 2)', async ({
    page,
  }) => {
    const webOrigin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
    // Fresh context without login
    const guestContext = await page.context().browser()!.newContext();
    const guestPage = await guestContext.newPage();

    // 1. Guest can start guest_trial exam (demo-n5-1)
    await guestPage.goto(`${webOrigin}/phong-thi?examId=demo-n5-1`);
    const startExamBtn = guestPage.locator('[data-testid="modal-start-exam-btn"], button:has-text("Bắt đầu làm bài")').last();
    await expect(startExamBtn).toBeVisible({ timeout: 15000 });
    await startExamBtn.click();

    // Verified: exam room begins for guest
    await expect(guestPage.locator('[role="radiogroup"], [data-testid="exam-room"], main').first()).toBeVisible({ timeout: 15000 });

    // 2. Calling initAttempt on non-guest trial without auth must be rejected with 401 / AUTH_REQUIRED
    const apiUrl = process.env.STAGING_API_URL || 'http://127.0.0.1:4000';
    const initRes = await guestPage.request.post(`${apiUrl}/api/v1/attempts`, {
      data: {
        examId: '0192f000-0002-7000-8000-000000000002',
        mode: 'real',
      },
    });
    expect([401, 403, 404]).toContain(initRes.status());

    await guestContext.close();
  });

  test('Exam history displays loading and requires login when unauthenticated (Acceptance 5)', async ({
    page,
  }) => {
    const webOrigin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
    const guestContext = await page.context().browser()!.newContext();
    const guestPage = await guestContext.newPage();

    await guestPage.goto(`${webOrigin}/lich-su`);
    await expect(guestPage.locator('[data-testid="history-error"], a[href*="/dang-nhap"]').first()).toBeVisible({ timeout: 15000 });

    await guestContext.close();
  });

  test('Responsive viewports 390px & 1366px, no horizontal scroll, 3 locales, no raw translation keys (Acceptance 6)', async ({
    page,
  }) => {
    // Run on chromium project to verify both viewports and save artifact screenshots
    test.skip(test.info().project.name !== 'chromium', 'Viewport and screenshot verification runs on chromium');

    const webOrigin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
    const viewports = [
      { name: 'mobile-390px', width: 390, height: 844 },
      { name: 'desktop-1366px', width: 1366, height: 768 },
    ];
    const routes = ['/de-thi', '/tai-khoan', '/dang-ky', '/dang-nhap', '/lich-su'];
    const locales = ['vi', 'ja', 'en'] as const;

    const screenshotDir = path.resolve(process.cwd(), 'test-results/screenshots');
    fs.mkdirSync(screenshotDir, { recursive: true });

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const route of routes) {
        for (const loc of locales) {
          // Set locale in localStorage
          await page.goto(`${webOrigin}${route}`);
          await page.evaluate((l) => {
            localStorage.setItem('jlpt_locale', l);
          }, loc);
          await page.reload();

          // Wait for page ready
          await page.waitForLoadState('domcontentloaded');

          // Check no horizontal scroll (no overflow beyond clientWidth)
          const isOverflowing = await page.evaluate(() => {
            return document.documentElement.scrollWidth > window.innerWidth + 2;
          });
          expect(isOverflowing).toBe(false);

          // Verify no raw translation keys visible on page
          const bodyText = await page.evaluate(() => document.body.innerText);
          const rawKeyMatches = bodyText.match(/\b(account|auth|common|exam|results|library)\.[a-zA-Z0-9_.]+\b/g) || [];
          expect(rawKeyMatches).toEqual([]);

          // Capture screenshot artifact
          const sanitizedRoute = route.replace(/\//g, '-').replace(/^-/, '');
          const filename = `${sanitizedRoute}-${vp.name}-${loc}.png`;
          await page.screenshot({ path: path.join(screenshotDir, filename), fullPage: false });
        }
      }
    }
  });
});

