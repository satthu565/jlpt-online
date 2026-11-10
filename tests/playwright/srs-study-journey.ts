import { test, expect, type Page } from '@playwright/test';

export function registerSrsStudyTests(): void {
  test.describe('Notebook SRS study session', () => {
    for (const width of [390, 1366]) {
      test(`workspace navigation, deck and local stars do not rate cards at ${width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 1100 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const writes: string[] = [];
        const cards = ['時計', '早い'].map((term, index) => ({ cardId: `workspace-${index}`, notebookItemId: `item-${index}`,
          front: { term, reading: index ? 'はやい' : 'とけい' }, back: { meaning: index ? 'Nhanh; mau lẹ.' : 'Đồng hồ', hanViet: index ? 'TẢO' : 'THỜI KẾ', examples: ['もう少し早いほうがいいです。'] },
          state: 'new', repetitions: 0, intervalDays: 0, dueAt: new Date().toISOString() }));
        await page.route('**/api/v1/**', async route => {
          const path = new URL(route.request().url()).pathname;
          if (route.request().method() !== 'GET') writes.push(path);
          const json = path.endsWith('/auth/session') ? { user: { id: 'workspace-user', name: 'Learner', role: 'student' }, session: {} }
            : path.endsWith('/me/srs/due') ? { items: cards, totalCount: 2 } : { items: [] };
          await route.fulfill({ json });
        });
        await page.goto('/so-tay', { waitUntil: 'networkidle' });
        const cookie = page.getByRole('button', { name: 'Từ chối cookie phân tích', exact: true });
        if (await cookie.isVisible()) await cookie.click();
        await page.locator('#tab-srs').click();
        await expect(page.getByTestId('srs-previous-card')).toBeDisabled();
        await page.getByTestId('srs-next-card').click();
        await expect(page.getByTestId('flashcard-view')).toContainText('Thẻ 2 / 2');
        await expect(page.getByTestId('srs-next-card')).toBeDisabled();
        await page.getByTestId('flashcard-flip-front').click();
        await page.getByTestId('srs-star-card').click();
        await expect(page.getByTestId('srs-star-card')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByTestId('flashcard-back')).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath('workspace-answer.png'), fullPage: true });
        await page.getByRole('tab', { name: 'Thẻ học (2)', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Ôn thẻ này', exact: true })).toHaveCount(2);
        await page.getByRole('tab', { name: 'Ôn tập', exact: true }).click();
        await page.getByRole('button', { name: 'Mục tiêu', exact: true }).click();
        await expect(page.locator('#srs-study-settings')).toBeVisible();
        await page.getByRole('button', { name: 'Mục tiêu', exact: true }).click();
        await page.getByTestId('srs-more-actions').click();
        await expect(page.getByRole('menu')).toBeVisible();
        await page.keyboard.press('Escape');
        expect(writes).toEqual([]);
        const before = await page.evaluate(() => JSON.parse(localStorage.getItem('jlpt_srs_study_v1:workspace-user')!));
        expect(before.session.events).toEqual([]);
        expect(before.starredCardIds).toEqual(['workspace-1']);
        await page.getByTestId('flashcard-flip-front').click();
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        // Keep the exit animation pending long enough to verify that changing modes
        // cannot unmount the card and cancel its rating callback.
        await page.evaluate(() => {
          const setTimer = window.setTimeout.bind(window);
          window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) => setTimer(handler, delay === 220 ? 1200 : delay, ...args)) as typeof window.setTimeout;
        });
        await page.getByTestId('rating-good-button').click();
        await expect(page.getByRole('tab', { name: 'Th? h?c (2)', exact: true })).toBeDisabled();
        await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('jlpt_srs_study_v1:workspace-user')!).session.events.map((event: { cardId: string }) => event.cardId))).toEqual(['workspace-1']);
        await page.getByTestId('srs-undo').click();
        await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('jlpt_srs_study_v1:workspace-user')!).session.events.length)).toBe(0);
        await page.reload({ waitUntil: 'networkidle' });
        await page.locator('#tab-srs').click();
        await page.getByRole('tab', { name: 'Thẻ học (2)', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Bỏ đánh dấu thẻ trên thiết bị', exact: true })).toHaveCount(1);
        expect(writes).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      });
    }

    for (const width of [390, 1366]) {
      test(`full-card hover stays transparent and both faces flip at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        const writes: string[] = [];
        const card = { cardId: 'flip-card', notebookItemId: 'flip-item', front: { term: '時計', reading: 'とけい' },
          back: { meaning: 'Đồng hồ', examples: ['時計を見ます。'] }, state: 'new', repetitions: 0,
          intervalDays: 0, dueAt: new Date().toISOString() };
        await page.route('**/api/v1/**', async route => {
          const path = new URL(route.request().url()).pathname;
          if (route.request().method() !== 'GET') writes.push(path);
          const json = path.endsWith('/auth/session') ? { user: { id: 'flip-learner', name: 'Learner', role: 'student' }, session: {} }
            : path.endsWith('/me/srs/due') ? { items: [card], totalCount: 1 } : { items: [] };
          await route.fulfill({ json });
        });
        await page.goto('/so-tay', { waitUntil: 'networkidle' });
        const cookie = page.getByRole('button', { name: 'Từ chối cookie phân tích', exact: true });
        if (await cookie.isVisible()) await cookie.click();
        await page.locator('#tab-srs').click();
        const front = page.getByTestId('flashcard-flip-front');
        const back = page.getByTestId('flashcard-flip-back');
        for (let round = 0; round < 3; round++) {
          await front.hover();
          await expect(front).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
          await front.click();
          await expect(page.getByTestId('flashcard-back')).toBeVisible();
          await back.hover();
          await expect(back).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
          await page.getByTestId('flashcard-card').click();
          await expect(page.getByTestId('flashcard-back')).toHaveCount(0);
        }
        await front.focus();
        await page.keyboard.press('Enter');
        await expect(page.getByTestId('flashcard-back')).toBeVisible();
        await back.focus();
        await page.keyboard.press('Space');
        await expect(page.getByTestId('flashcard-back')).toHaveCount(0);
        expect(writes).toEqual([]);
        await expect(page.getByTestId('flashcard-view').locator('button button')).toHaveCount(0);
      });
    }

    test('reset requires confirmation, supports retry, reloads new cards and blocks unsaved drafts', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const ids = ['0192f000-0000-7000-8000-000000000001', '0192f000-0000-7000-8000-000000000002'];
      let due: unknown[] = [];
      let loads = 0;
      const resets: unknown[] = [];
      await page.route('**/api/v1/**', async route => {
        const path = new URL(route.request().url()).pathname;
        let json: unknown = { items: [] };
        if (path.endsWith('/auth/session')) json = { user: { id: 'reset-learner', name: 'Reset', role: 'student' }, session: {} };
        if (path.endsWith('/me/srs/due')) json = { items: due };
        if (path.endsWith('/me/srs/reset-candidates')) { loads++; json = { cardIds: ids, count: 2 }; }
        if (path.endsWith('/me/srs/reset')) {
          resets.push(route.request().postDataJSON());
          if (resets.length === 1) { await route.fulfill({ status: 503, json: { message: 'retry' } }); return; }
          due = ids.map((_, index) => ({ cardId: 'fresh-' + index, notebookItemId: 'item-' + index,
            front: { term: index ? '学校' : '学生' }, back: { meaning: 'Học sinh' },
            state: 'new', repetitions: 0, intervalDays: 1, dueAt: new Date().toISOString() }));
          json = { resetCount: 2, alreadyReset: false };
        }
        await route.fulfill({ json });
      });
      await page.goto('/so-tay', { waitUntil: 'networkidle' });
      const cookie = page.getByRole('button', { name: 'Từ chối cookie phân tích', exact: true });
      if (await cookie.isVisible()) await cookie.click();
      await page.locator('#tab-srs').click();
      await page.getByTestId('srs-reset-open').click();
      await expect(page.getByRole('dialog')).toContainText('Sẽ đặt lại 2 thẻ đã nhớ trong SRS.');
      expect(resets).toHaveLength(0);
      await page.getByRole('dialog').getByRole('button', { name: 'Hủy', exact: true }).last().click();
      expect(resets).toHaveLength(0);
      await page.getByTestId('srs-reset-open').click();
      await page.getByTestId('srs-reset-confirm').click();
      await expect(page.getByRole('dialog')).toContainText('Chưa hoàn tất reset.');
      await expect(page.getByTestId('srs-reset-confirm')).toBeEnabled();
      await page.getByTestId('srs-reset-confirm').click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.locator('.srs-runner')).toContainText('Thẻ mới: 2');
      await expect(page.getByTestId('flashcard-view')).toBeVisible();
      expect(resets).toEqual([{ cardIds: ids, confirmed: true }, { cardIds: ids, confirmed: true }]);
      await flip(page);
      await page.getByTestId('rating-good-button').click();
      await expect(page.locator('.srs-runner')).toContainText('Đang giữ 1 đánh giá');
      await page.getByTestId('srs-reset-open').click();
      await expect(page.locator('.srs-runner')).toContainText('Hãy kết thúc ôn thêm và lưu, đồng bộ hết kết quả đang chờ trước khi reset.');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(loads).toBe(2);
    });

    test('does not pretend to reset when the deployed API is not ready', async ({ page }) => {
      let resets = 0;
      await page.route('**/api/v1/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith('/me/srs/reset-candidates')) { await route.fulfill({ status: 404, json: { message: 'Not found' } }); return; }
        if (path.endsWith('/me/srs/reset')) resets++;
        const json = path.endsWith('/auth/session') ? { user: { id: 'old-api-learner', name: 'Old API', role: 'student' }, session: {} } : { items: [] };
        await route.fulfill({ json });
      });
      await page.goto('/so-tay', { waitUntil: 'networkidle' });
      const cookie = page.getByRole('button', { name: 'Từ chối cookie phân tích', exact: true });
      if (await cookie.isVisible()) await cookie.click();
      await page.locator('#tab-srs').click();
      await page.getByTestId('srs-reset-open').click();
      await expect(page.getByRole('dialog')).toContainText('Máy chủ chưa có chức năng reset SRS.');
      await expect(page.getByTestId('srs-reset-confirm')).toBeDisabled();
      expect(resets).toBe(0);
    });

    test('recovers a legacy failed review and keeps its cards available for extra practice', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const card = { cardId: 'legacy-card', notebookItemId: 'legacy-item', front: { term: '学生' }, back: { meaning: 'Học sinh' }, state: 'review', repetitions: 2, intervalDays: 6, dueAt: new Date().toISOString() };
      let due = [card];
      const sent: string[] = [];
      await page.route('**/api/v1/**', async route => {
        const path = new URL(route.request().url()).pathname;
        let json: unknown = { items: [] };
        if (path.endsWith('/auth/session')) json = { user: { id: 'legacy-srs', name: 'Legacy', role: 'student' }, session: {} };
        if (path.endsWith('/me/srs/due')) json = { items: due };
        if (path.endsWith('/me/srs/reviews')) {
          const body = route.request().postDataJSON() as { clientReviewId: string };
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.clientReviewId)) {
            await route.fulfill({ status: 500, json: { message: 'invalid UUID' } }); return;
          }
          sent.push(body.clientReviewId); due = [];
          json = { reviewedAt: new Date().toISOString() };
        }
        await route.fulfill({ json });
      });
      await page.addInitScript(() => {
        if (localStorage.getItem('legacy-fixture-initialized')) return;
        localStorage.setItem('legacy-fixture-initialized', 'true');
        const now = Date.now(); const date = new Date(now);
        const day = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
        localStorage.setItem('jlpt_srs_study_v1:legacy-srs', JSON.stringify({
          version: 1, settings: { dailyGoal: 5, newPerDay: 10 }, days: { [day]: { reviewed: ['legacy-card'], introduced: [] } },
          session: { cards: [], events: [], savedCount: 0, startedAt: now },
        }));
        localStorage.setItem('jlpt_srs_sync_v2:legacy-srs', JSON.stringify([{
          id: 'rev-legacy-not-uuid', cardId: 'legacy-card', rating: 3, reviewedAt: new Date(now).toISOString(),
          timezone: 'Asia/Ho_Chi_Minh', status: 'failed', attempts: 1,
        }]));
      });
      await page.goto('/so-tay', { waitUntil: 'networkidle' });
      const cookie = page.getByRole('button', { name: 'Từ chối cookie phân tích', exact: true });
      if (await cookie.isVisible()) await cookie.click();
      await page.locator('#tab-srs').click();
      await expect(page.getByTestId('sync-status-badge')).toContainText('Đã đồng bộ máy chủ');
      await expect(page.getByTestId('srs-practice-start')).toBeVisible();
      expect(sent).toHaveLength(1);
      await page.reload({ waitUntil: 'networkidle' });
      await page.locator('#tab-srs').click();
      await expect(page.getByTestId('srs-practice-start')).toBeVisible();
      await expect(page.locator('.srs-runner')).toContainText('Có 1 thẻ đã học để ôn lại.');
      await page.getByTestId('srs-practice-start').click();
      await flip(page);
      await page.getByTestId('rating-good-button').click();
      await expect(page.locator('.srs-runner')).toContainText('Đã hoàn tất lượt ôn thêm');
      await expect(page.locator('.srs-runner')).toContainText('Đã ôn 1 / 5 thẻ hôm nay');
      expect(sent).toHaveLength(1);
    });

    for (const width of [1366, 390]) {
      test(`relearning, Undo, daily goals and durable save at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.clock.install({ time: new Date('2026-11-10T03:00:00Z') });
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        let reviews: Array<{ cardId: string; clientReviewId: string; rating: number }> = [];
        let offline = false;
        const cards = [
          { cardId: 'review-one', notebookItemId: 'item-one', front: { term: '学生' }, back: { meaning: 'Học sinh', examples: ['学生です。'] }, state: 'review', repetitions: 2, intervalDays: 6, easeFactor: 250, dueAt: '2026-11-10T00:00:00Z' },
          { cardId: 'new-two', notebookItemId: 'item-two', front: { term: '挑戦' }, back: { meaning: 'Thử thách' }, state: 'learning', repetitions: 0, intervalDays: 1, dueAt: '2026-11-10T00:00:00Z' },
        ];
        let dueCards = cards;
        await page.route('**/api/v1/**', async route => {
          const path = new URL(route.request().url()).pathname;
          let json: unknown = { items: [] };
          if (path.endsWith('/auth/session')) json = { user: { id: 'srs-study-fixture', email: 'srs@example.invalid', name: 'SRS Test', role: 'student' }, session: {} };
          if (path.endsWith('/me/notebook-items')) json = { items: [], total: 0 };
          if (path.endsWith('/me/srs/due')) json = { items: dueCards, totalCount: dueCards.length };
          if (path.endsWith('/me/srs/reviews')) {
            if (offline) { await route.abort('failed'); return; }
            const body = route.request().postDataJSON() as typeof reviews[number];
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.clientReviewId)) {
              await route.fulfill({ status: 400, json: { message: 'clientReviewId must be UUID' } }); return;
            }
            reviews.push(body);
            json = { reviewedAt: new Date().toISOString() };
          }
          await route.fulfill({ status: 200, json });
        });
        // HTTP on a LAN IP does not expose randomUUID; the review ID path must still work.
        await page.addInitScript(() => { Object.defineProperty(crypto, 'randomUUID', { value: undefined }); });
        await page.goto('/so-tay', { waitUntil: 'networkidle' });
        const dismissCookies = page.getByRole('button', { name: 'Từ chối cookie phân tích', exact: true });
        if (await dismissCookies.isVisible()) await dismissCookies.click();
        await page.locator('#tab-srs').click();
        const session = page.locator('.srs-runner');
        await expect(page.getByTestId('flashcard-view')).toContainText('学生');
        await session.getByRole('button', { name: 'Mục tiêu', exact: true }).click();
        const newLimit = session.getByRole('button', { name: 'Giới hạn thẻ mới mỗi ngày' });
        // HeroSelect exposes a combobox trigger in current HeroUI.
        const trigger = await newLimit.count() ? newLimit : session.getByRole('combobox', { name: 'Giới hạn thẻ mới mỗi ngày' });
        await trigger.click();
        await page.getByRole('option', { name: '0 thẻ / ngày', exact: true }).click();
        await expect(session).toContainText('Thẻ mới: 0');
        await session.getByRole('button', { name: 'Mục tiêu', exact: true }).click();
        await flip(page);
        await expect(page.getByTestId('rating-good-button')).toContainText('Ôn lại sau 15 ngày');
        await page.getByTestId('rating-again-button').click();
        await expect(page.getByTestId('srs-waiting-card')).toBeVisible();
        await expect(page.getByTestId('srs-finished-card')).toHaveCount(0);
        expect(reviews).toHaveLength(0);
        await page.getByTestId('srs-undo').click();
        await expect(page.getByTestId('flashcard-view')).toContainText('学生');
        await expect(session).toContainText('Đã ôn 0 / 20 thẻ hôm nay');
        await flip(page);
        await page.getByTestId('rating-again-button').click();
        await expect(page.getByTestId('srs-waiting-card')).toBeVisible();
        await page.reload({ waitUntil: 'networkidle' });
        await page.locator('#tab-srs').click();
        await expect(page.getByTestId('srs-waiting-card')).toBeVisible();
        await page.clock.fastForward('10:01');
        await expect(page.getByTestId('flashcard-view')).toContainText('学生');
        await flip(page);
        await page.getByTestId('rating-good-button').click();
        await expect(page.getByTestId('srs-finished-card')).toBeVisible();
        await expect(session).toContainText('Đã giữ lại 1 thẻ mới');
        await expect(session).toContainText('Đã ôn 1 / 20 thẻ hôm nay');
        expect(reviews).toHaveLength(0);
        offline = true;
        await page.getByTestId('srs-save').click();
        await expect(session).toContainText('Chờ đồng bộ: 2 thẻ');
        await expect(page.getByTestId('srs-undo')).toBeDisabled();
        offline = false;
        await page.getByTestId('srs-save').click();
        await expect(session).toContainText('Đã đồng bộ máy chủ');
        expect(reviews.map(review => review.rating)).toEqual([1, 3]);
        expect(new Set(reviews.map(review => review.clientReviewId)).size).toBe(2);
        await page.getByTestId('srs-practice-start').click();
        await expect(page.getByTestId('flashcard-view')).toContainText('学生');
        await flip(page);
        await expect(page.getByTestId('rating-good-button')).toContainText('Tiếp tục lượt ôn thêm');
        await page.getByTestId('rating-again-button').click();
        await expect(page.getByTestId('flashcard-view')).toContainText('学生');
        await flip(page);
        await page.getByTestId('rating-good-button').click();
        await expect(session).toContainText('Đã hoàn tất lượt ôn thêm');
        await expect(session).toContainText('Đã ôn 1 / 20 thẻ hôm nay');
        expect(reviews).toHaveLength(2);
        await page.getByTestId('srs-practice-start').click();
        await expect(page.getByTestId('flashcard-view')).toBeVisible();
        await page.getByTestId('srs-practice-exit').click();
        dueCards = [];
        await page.reload({ waitUntil: 'networkidle' });
        await page.locator('#tab-srs').click();
        await expect(page.getByTestId('srs-practice-start')).toBeVisible();
        await expect(session).not.toContainText('Bạn đã ôn 0 thẻ trong buổi này.');
        await page.getByTestId('srs-practice-start').click();
        await flip(page);
        await page.getByTestId('rating-good-button').click();
        await expect(session).toContainText('Đã hoàn tất lượt ôn thêm');
        expect(reviews).toHaveLength(2);

        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect(errors).toEqual([]);
        // Switching accounts must not restore another learner's drafts or daily progress.
        reviews = [];
        dueCards = cards;
        await page.route('**/auth/session', route => route.fulfill({ json: { user: { id: 'other-srs-learner', name: 'Other', role: 'student' }, session: {} } }));
        await page.reload({ waitUntil: 'networkidle' });
        await page.locator('#tab-srs').click();
        await expect(session).toContainText('Đã ôn 0 / 20 thẻ hôm nay');
        await expect(session).toContainText('Thẻ mới: 1');
      });
    }
  });
}
async function flip(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Xem đáp án (Phím Space)', exact: true }).click();
  await expect(page.getByTestId('flashcard-back')).toBeVisible();
}
