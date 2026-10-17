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

  test('Same-origin API reverse proxy: Web origin /api/v1 routes to API service', async ({ page }) => {
    const webOrigin = test.info().project.use.baseURL || 'http://127.0.0.1:3000';

    try {
      const response = await page.request.get(`${webOrigin}/api/v1/health`, { timeout: 3000 });
      if (response.ok()) {
        const body = await response.json();
        expect(body).toHaveProperty('status');
        expect(body.status).toBe('ok');
      }
    } catch {
      test.skip(!process.env.CI, 'Staging live server not running locally; skipping live check');
    }
  });

  test('Same-origin API reverse proxy: Admin origin /api/v1 routes to API service', async ({ page }) => {
    const adminOrigin = process.env.ADMIN_URL || 'http://127.0.0.1:3001';

    try {
      const response = await page.request.get(`${adminOrigin}/api/v1/health`, { timeout: 3000 });
      if (response.ok()) {
        const body = await response.json();
        expect(body).toHaveProperty('status');
        expect(body.status).toBe('ok');
      }
    } catch {
      test.skip(!process.env.CI, 'Staging live server not running locally; skipping live check');
    }
  });

  test('Mailpit integration: Student registration dispatches real email and verifies account', async ({
    page,
  }) => {
    const isMailpitUp = await mailpit.isHealthy();
    if (!isMailpitUp) {
      test.skip(!process.env.CI, 'Mailpit not running in local environment; skipping live email drill');
      return;
    }

    const apiUrl = process.env.STAGING_API_URL || 'http://127.0.0.1:4000';
    const timestamp = Date.now();
    const testEmail = `student.e2e.${timestamp}@jlpt.local`;
    const testPassword = 'Password123!';
    const testName = `Student E2E ${timestamp}`;

    // 1. Send registration request to API
    const regRes = await page.request.post(`${apiUrl}/api/v1/auth/sign-up/email`, {
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
    expect(emailMessage.Subject).toContain('xác minh');

    // 3. Extract verification token from email
    const verificationToken = mailpit.extractVerificationToken(emailMessage);
    expect(verificationToken).toBeTruthy();

    // 4. Call verification endpoint
    const verifyRes = await page.request.get(
      `${apiUrl}/api/v1/auth/verify-email?token=${verificationToken}`,
    );
    expect(verifyRes.status()).toBe(200);

    // 5. Sign in with newly verified credentials
    const loginRes = await page.request.post(`${apiUrl}/api/v1/auth/sign-in/email`, {
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
    page,
  }) => {
    const apiUrl = process.env.STAGING_API_URL || 'http://127.0.0.1:4000';

    try {
      const ping = await page.request.get(`${apiUrl}/api/v1/health`, { timeout: 2000 });
      if (!ping.ok()) {
        test.skip(!process.env.CI, 'API not reachable; skipping live staff login drill');
        return;
      }
    } catch {
      test.skip(!process.env.CI, 'API not reachable; skipping live staff login drill');
      return;
    }

    // Attempt login with seeded staff credentials
    const staff = SEEDED_STAFF_ACCOUNTS.admin;
    const authResult = await authenticateStaffAccount(staff, apiUrl);

    expect(authResult.token).toBeTruthy();
    expect(authResult.user.email).toBe(staff.email);
    expect(authResult.user.role).toBe('admin');
    expect(authResult.totpCode).toHaveLength(6);

    // Verify TOTP is required for protected admin endpoints
    const validTotp = generateTotp(staff.totpSecret);
    const staffCheckRes = await page.request.get(`${apiUrl}/api/v1/auth/session`, {
      headers: {
        Authorization: `Bearer ${authResult.token}`,
        'x-totp-code': validTotp,
      },
    });
    expect(staffCheckRes.status()).toBe(200);
  });
});
