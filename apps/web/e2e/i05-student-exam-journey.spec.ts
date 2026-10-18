import { test, expect } from '@playwright/test';
import { MailpitHelper } from './helpers/mailpit.js';
import fs from 'node:fs';
import path from 'node:path';

/**
 * End-to-End Integration Suite with Real Services (I05 / W3)
 * Runs against Staging CI infrastructure (Next.js Web + NestJS API + PostgreSQL + Redis + Mailpit).
 *
 * Acceptance Criteria (I05):
 * 1. Học viên đăng ký qua Mailpit, xác minh, làm trọn đề demo N5 đã xuất bản và xem điểm trên staging CI.
 * 2. Khách làm thử được đề guest_trial, đề khác yêu cầu đăng nhập.
 * 3. Không còn dữ liệu viết cứng, mảng mẫu hay đăng nhập giả trong các trang thuộc phạm vi.
 * 4. E2E Playwright chạy trên staging thật trong CI; cấm page.route, mock fetch hay dữ liệu giả ở tầng trình duyệt.
 * 5. Trang có trạng thái đang tải, rỗng và lỗi API hiển thị rõ; lỗi 401/403 đưa về đăng nhập hoặc báo thiếu quyền.
 * 6. E2E chụp màn hình mỗi trang trong phạm vi ở 390px và 1366px (lưu artifact CI) và kiểm tra không cuộn ngang;
 *    class Tailwind có tác dụng, không để dính mép; không hiện key dịch thô, kiểm tra cả 3 locale vi ja en.
 */
test.describe('I05 Real API & Infrastructure End-to-End Suite', () => {
  const mailpit = new MailpitHelper();
  const screenshotsDir = path.resolve(process.cwd(), 'test-results/screenshots');
  let lastSubmittedAttemptId: string | null = null;

  test.beforeAll(async () => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ context, baseURL }) => {
    const domain = new URL(baseURL || 'http://127.0.0.1:3000').hostname;
    await context.addCookies([
      {
        name: 'jlpt_consent',
        value: 'all',
        domain,
        path: '/',
      },
    ]);
    await context.addInitScript(() => {
      try {
        localStorage.setItem('jlpt_cookie_consent', 'all');
      } catch {
        // Ignore storage access error in headless sandbox
      }
    });
  });

  // Helper to ensure server is reachable
  const checkStagingLive = async (baseURL: string): Promise<boolean> => {
    try {
      const res = await fetch(`${baseURL}/healthz`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  };

  /**
   * Acceptance 1 & 4: Full User Journey (Register -> Mailpit Verify -> Login -> Exam -> Submit -> Review -> History)
   */
  test('Complete Student Journey: Register -> Mailpit Verify -> Take Demo N5 Exam -> Submit -> Review Score & History', async ({
    page,
    baseURL,
  }) => {
    const webOrigin = baseURL || 'http://127.0.0.1:3000';
    const isLive = await checkStagingLive(webOrigin);
    if (!isLive) {
      if (!process.env.CI) {
        test.skip(true, 'Staging server not running locally; skipping live browser journey drill');
        return;
      }
      throw new Error(`Staging web server unreachable at ${webOrigin}`);
    }

    const isMailpitUp = await mailpit.isHealthy();
    if (!isMailpitUp) {
      if (!process.env.CI) {
        test.skip(true, 'Mailpit service not running locally; skipping live email drill');
        return;
      }
      throw new Error('Mailpit service unreachable on staging CI');
    }

    const timestamp = Date.now();
    const testEmail = `student.journey.${timestamp}@jlpt.local`;
    const testPassword = 'Password123!';
    const testName = `Học Viên E2E ${timestamp}`;

    // -------------------------------------------------------------
    // Step 1: Student Registration Form (/dang-ky)
    // -------------------------------------------------------------
    await page.goto('/dang-ky');
    await expect(page).toHaveURL(/.*\/dang-ky/);

    await page.fill('#register-name', testName);
    await page.fill('#register-email', testEmail);
    await page.fill('#register-password', testPassword);
    await page.fill('#register-confirm-password', testPassword);
    await page.check('#agree-terms');

    await page.click('button[type="submit"]');

    // Expect success alert to be visible
    await expect(page.locator('.jlpt-alert-success, [role="alert"]').first()).toContainText(
      /thành công|xác minh/i,
      { timeout: 10000 },
    );

    // -------------------------------------------------------------
    // Step 2: Poll Mailpit for Verification Email and extract link
    // -------------------------------------------------------------
    const emailMessage = await mailpit.waitForEmail(testEmail, 15000);
    expect(emailMessage.Subject.toLowerCase()).toContain('xác minh');

    const token = mailpit.extractVerificationToken(emailMessage);
    expect(token).toBeTruthy();

    // -------------------------------------------------------------
    // Step 3: Verify Account (/xac-minh-email?token=...)
    // -------------------------------------------------------------
    await page.goto(`/xac-minh-email?token=${token}`);
    await expect(page.locator('.jlpt-alert-success, [role="alert"]').first()).toContainText(
      /xác minh thành công/i,
      { timeout: 10000 },
    );

    // -------------------------------------------------------------
    // Step 4: Login as Verified Student (/dang-nhap)
    // -------------------------------------------------------------
    await page.goto('/dang-nhap');
    await page.fill('#login-email', testEmail);
    await page.fill('#login-password', testPassword);
    await page.click('button[type="submit"]');

    // Wait for redirect to /tai-khoan or authenticated state
    await page.waitForURL(/.*(\/tai-khoan|\/de-thi)/, { timeout: 10000 });

    // -------------------------------------------------------------
    // Step 5: Browse Exam Library (/de-thi)
    // -------------------------------------------------------------
    await page.goto('/de-thi');
    await expect(page.locator('h1')).toBeVisible();

    // The demo N5 exam must be present in the library
    const demoCard = page.locator('text=demo-n5-1').or(page.locator('text=N5')).first();
    await expect(demoCard).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------
    // Step 6: Enter Exam Room (/phong-thi) and Start Attempt
    // -------------------------------------------------------------
    await page.goto('/phong-thi?examId=demo-n5-1&mode=real');

    // Instructions modal should open; click start button within modal dialog
    const modalConfirmBtn = page.locator('[role="dialog"], .jlpt-modal').locator('button:has-text("Bắt đầu làm bài")');
    if (await modalConfirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await modalConfirmBtn.click();
    } else {
      await page.locator('button:has-text("Bắt đầu làm bài")').first().click();
      const modalBtn = page.locator('[role="dialog"], .jlpt-modal').locator('button:has-text("Bắt đầu làm bài")');
      await expect(modalBtn).toBeVisible({ timeout: 5000 });
      await modalBtn.click();
    }

    // Wait for real snapshot to load and question view to render
    const questionCard = page.locator('.jlpt-question-card, article[aria-label*="Câu hỏi"]');
    await expect(questionCard).toBeVisible({ timeout: 15000 });

    // -------------------------------------------------------------
    // Step 7: Answer Questions and Navigate Through Sections
    // -------------------------------------------------------------
    // Answer first question
    const firstOption = page.locator('button[role="radio"]').first();
    await firstOption.click();
    await expect(firstOption).toHaveAttribute('aria-checked', 'true');

    // Navigate to next questions or submit directly
    const nextBtn = page.locator('button:has-text("Câu sau")');
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      const option2 = page.locator('button[role="radio"]').first();
      if (await option2.isVisible()) {
        await option2.click();
      }
    }

    // Advance through any remaining sections if present
    const nextSectionBtn = page.locator('button:has-text("Chuyển phần tiếp theo")');
    while (await nextSectionBtn.isVisible()) {
      await nextSectionBtn.click();
      const confirmSection = page.locator('button:has-text("Xác nhận chuyển phần")');
      if (await confirmSection.isVisible()) {
        await confirmSection.click();
      }
      await page.waitForTimeout(500);
    }

    // -------------------------------------------------------------
    // Step 8: Submit Exam Attempt
    // -------------------------------------------------------------
    const submitBtn = page.locator('button[aria-label="Nộp bài thi"], button:has-text("Nộp bài")').first();
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await submitBtn.click();

    // Confirm in EarlySubmitModal
    const confirmSubmitBtn = page.locator('button:has-text("Xác nhận nộp bài")');
    await expect(confirmSubmitBtn).toBeVisible({ timeout: 5000 });
    await confirmSubmitBtn.click();

    // Expect submission success screen
    await expect(page.locator('text=Nộp bài thi thành công!')).toBeVisible({ timeout: 15000 });

    // -------------------------------------------------------------
    // Step 9: View Certified Result & Score Report (/ket-qua/[id])
    // -------------------------------------------------------------
    const reviewLink = page.locator('a:has-text("Xem lại bài làm")');
    await expect(reviewLink).toBeVisible();
    await reviewLink.click();

    await page.waitForURL(/.*\/ket-qua\/.+/, { timeout: 10000 });
    const currentUrl = page.url();
    const match = currentUrl.match(/\/ket-qua\/([^/?#]+)/);
    if (match) {
      lastSubmittedAttemptId = match[1]!;
    }
    // Verify score summary card is rendered with real scoring
    await expect(page.locator('.jlpt-score-card, text=/ 180')).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------
    // Step 10: Check Exam History (/lich-su)
    // -------------------------------------------------------------
    await page.goto('/lich-su');
    await expect(page.locator('h1')).toContainText('Lịch sử làm bài thi');

    // The newly submitted attempt must be present in the history table/list
    await expect(page.locator('text=demo-n5-1').or(page.locator('text=N5')).first()).toBeVisible({
      timeout: 10000,
    });
  });

  /**
   * Acceptance 2: Guest Trial Access vs Protected Exam Login Requirement
   */
  test('Guest Trial Access: guest_trial exam allowed without login; non-trial requires authentication', async ({
    browser,
    baseURL,
  }) => {
    const webOrigin = baseURL || 'http://127.0.0.1:3000';
    const isLive = await checkStagingLive(webOrigin);
    if (!isLive) {
      if (!process.env.CI) {
        test.skip(true, 'Staging server not running locally; skipping guest drill');
        return;
      }
      throw new Error(`Staging web server unreachable at ${webOrigin}`);
    }

    // Fresh guest context without any auth cookies
    const guestContext = await browser.newContext();
    const domain = new URL(webOrigin).hostname;
    await guestContext.addCookies([
      {
        name: 'jlpt_consent',
        value: 'all',
        domain,
        path: '/',
      },
    ]);
    await guestContext.addInitScript(() => {
      try {
        localStorage.setItem('jlpt_cookie_consent', 'all');
      } catch {
        // Ignore storage access error in headless sandbox
      }
    });
    const guestPage = await guestContext.newPage();

    // 1. Guest accesses guest_trial exam (demo-n5-1)
    await guestPage.goto('/phong-thi?examId=demo-n5-1&mode=practice');
    const modalStartBtn = guestPage.locator('[role="dialog"], .jlpt-modal').locator('button:has-text("Bắt đầu làm bài")');
    if (await modalStartBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await modalStartBtn.click({ force: true });
    } else {
      await guestPage.locator('button:has-text("Bắt đầu làm bài")').first().click({ force: true });
      const modalBtn = guestPage.locator('[role="dialog"], .jlpt-modal').locator('button:has-text("Bắt đầu làm bài")');
      await expect(modalBtn).toBeVisible({ timeout: 5000 });
      await modalBtn.click({ force: true });
    }

    // Guest can load exam room for guest trial
    await expect(
      guestPage.locator('.jlpt-question-card, article[aria-label*="Câu hỏi"]'),
    ).toBeVisible({ timeout: 15000 });

    // 2. Guest attempts to access a protected non-trial exam or direct attempt creation
    // Navigating with a non-existent or VIP exam must either show login prompt or redirect to /dang-nhap
    await guestPage.goto('/phong-thi?examId=vip-n1-exam&mode=real');
    const loginPrompt = guestPage
      .locator('main text=yêu cầu đăng nhập')
      .or(guestPage.locator('main a[href*="/dang-nhap"]'))
      .or(guestPage.locator('main text=Đăng nhập'));

    await expect(loginPrompt.first()).toBeVisible({ timeout: 10000 });
    await guestContext.close();
  });

  /**
   * Acceptance 6: Multi-Viewport Responsive Layout (390px & 1366px), Screenshots & Zero Horizontal Overflow
   */
  test('Multi-Viewport Verification: 390px vs 1366px, Screenshots, and No Horizontal Scroll', async ({
    page,
    baseURL,
  }) => {
    const webOrigin = baseURL || 'http://127.0.0.1:3000';
    const isLive = await checkStagingLive(webOrigin);
    if (!isLive) {
      if (!process.env.CI) {
        test.skip(true, 'Staging server not running locally; skipping viewport drill');
        return;
      }
      throw new Error(`Staging web server unreachable at ${webOrigin}`);
    }

    const viewports = [
      { name: 'mobile-390', width: 390, height: 844 },
      { name: 'desktop-1366', width: 1366, height: 768 },
    ];

    const resultRoute = lastSubmittedAttemptId
      ? `/ket-qua/${lastSubmittedAttemptId}`
      : '/ket-qua/demo-test';

    const scopedRoutes = [
      { path: '/de-thi', slug: 'de-thi' },
      { path: '/phong-thi', slug: 'phong-thi' },
      { path: '/lich-su', slug: 'lich-su' },
      { path: resultRoute, slug: 'ket-qua' },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const route of scopedRoutes) {
        await page.goto(route.path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);

        // 1. Capture and save CI screenshot artifact
        const screenshotPath = path.join(screenshotsDir, `${route.slug}-${vp.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        expect(fs.existsSync(screenshotPath)).toBe(true);

        // 2. Strict layout engine test: document.documentElement.scrollWidth <= window.innerWidth
        const isOverflowing = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(isOverflowing).toBe(false);
      }
    }
  });

  /**
   * Acceptance 6: Zero Raw Translation Keys in All 3 Locales (vi, ja, en)
   */
  test('i18n Translation Integrity: No raw translation keys bleed in vi, ja, and en', async ({
    page,
    baseURL,
  }) => {
    const webOrigin = baseURL || 'http://127.0.0.1:3000';
    const isLive = await checkStagingLive(webOrigin);
    if (!isLive) {
      if (!process.env.CI) {
        test.skip(true, 'Staging server not running locally; skipping i18n locale drill');
        return;
      }
      throw new Error(`Staging web server unreachable at ${webOrigin}`);
    }

    const locales = ['vi', 'ja', 'en'];
    const testRoutes = ['/de-thi', '/dang-nhap', '/dang-ky', '/lich-su'];

    for (const locale of locales) {
      // Set NEXT_LOCALE cookie
      await page.context().addCookies([
        {
          name: 'NEXT_LOCALE',
          value: locale,
          domain: new URL(webOrigin).hostname,
          path: '/',
        },
      ]);

      for (const route of testRoutes) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });

        // Check page text for unrendered raw translation keys like account.profile.title, auth.login.title, etc.
        const pageText = await page.evaluate(() => document.body.innerText);
        expect(pageText).not.toMatch(/\b(account|auth|common|exam|billing)\.[a-zA-Z0-9_.]+\b/);
      }
    }
  });
});
