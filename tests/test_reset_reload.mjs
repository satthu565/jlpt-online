import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  let planStatus = 'active';
  const interceptedRequests = [];

  page.on('request', (req) => {
    if (req.url().includes('study-plans') || req.url().includes('study-sessions')) {
      interceptedRequests.push({
        url: req.url(),
        method: req.method(),
        contentType: req.headers()['content-type'],
        hasBody: !!req.postData()
      });
    }
  });

  await page.addInitScript(() => {
    localStorage.setItem('jlpt_auth_token', 'mock-test-token');
    localStorage.setItem('jlpt_cached_user', JSON.stringify({
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'student',
      emailVerified: true
    }));
  });

  await page.route('**/auth/session*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'student',
          emailVerified: true
        },
        session: { id: 'sess-1', userId: 'test-user-id' }
      })
    });
  });

  // Intercept DELETE
  await page.route('**/api/v1/me/study-plans/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      const ct = route.request().headers()['content-type'];
      console.log('DELETE request headers content-type:', ct);
      if (ct) {
        console.error('FAIL: Content-Type header should NOT be present on DELETE without body!');
      } else {
        console.log('PASS: Content-Type header is not present on DELETE without body.');
      }
      planStatus = 'archived';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ archived: true })
      });
      return;
    }
    await route.continue();
  });

  await page.route('**/api/v1/me/study-sessions/today*', async (route) => {
    console.log('GET today called, planStatus is:', planStatus);
    if (planStatus === 'active') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          plan: {
            id: 'plan-999',
            userId: 'test-user-id',
            targetLevel: 'N2',
            targetExamDate: '2026-12-06',
            dailyTargetMinutes: 45,
            currentStreak: 3,
            completionRate: 20,
            completedSessions: 6,
            totalSessions: 30,
            currentVersion: 1,
            daysRemaining: 90,
            isFinalSprint: false,
            config: { focusSkills: ['vocabulary', 'grammar'] },
            sessions: []
          },
          session: null
        })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          plan: null,
          session: null,
          message: 'Bạn chưa có kế hoạch học tập đang kích hoạt.'
        })
      });
    }
  });

  console.log('Step 1: Navigating to ke-hoach with active plan...');
  await page.goto('http://127.0.0.1:3210/ke-hoach');
  await page.waitForTimeout(1500);

  const resetBtn = await page.$('[data-testid="reset-plan-button"]');
  console.log('Reset button visible initially:', !!resetBtn);
  if (!resetBtn) {
    throw new Error('Reset button not found on initial load!');
  }

  console.log('Step 2: Clicking reset plan button...');
  await resetBtn.click();
  await page.waitForTimeout(600);

  const confirmBtn = await page.$('[data-testid="confirm-reset-plan-button"]');
  console.log('Confirm button visible:', !!confirmBtn);
  await confirmBtn.click();
  await page.waitForTimeout(1500);

  console.log('Step 3: Checking empty state immediately after reset...');
  let bodyText = await page.innerText('body');
  console.log('Immediately has success banner:', bodyText.includes('Đã hủy kế hoạch cũ thành công'));
  console.log('Immediately has empty state:', bodyText.includes('Bạn chưa thiết lập kế hoạch học tập'));

  console.log('Step 4: Reloading page (F5 simulation)...');
  await page.reload();
  await page.waitForTimeout(1500);

  console.log('Step 5: Checking state AFTER RELOAD...');
  bodyText = await page.innerText('body');
  const hasOldPlan = bodyText.includes('N2');
  const hasEmptyState = bodyText.includes('Bạn chưa thiết lập kế hoạch học tập');
  const resetBtnAfterReload = await page.$('[data-testid="reset-plan-button"]');

  console.log('Has old plan after reload:', hasOldPlan);
  console.log('Has empty state after reload:', hasEmptyState);
  console.log('Reset button present after reload:', !!resetBtnAfterReload);

  if (!hasOldPlan && hasEmptyState && !resetBtnAfterReload) {
    console.log('SUCCESS: Page reload correctly persists the reset plan (empty state)!');
  } else {
    console.error('FAIL: Plan was still shown after reload!');
  }

  await browser.close();
})();
