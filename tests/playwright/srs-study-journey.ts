import { test, expect, type Page } from '@playwright/test';

export function registerSrsStudyTests(): void {
  test.describe('Notebook SRS study session', () => {
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
        await page.route('**/api/v1/**', async route => {
          const path = new URL(route.request().url()).pathname;
          let json: unknown = { items: [] };
          if (path.endsWith('/auth/session')) json = { user: { id: 'srs-study-fixture', email: 'srs@example.invalid', name: 'SRS Test', role: 'student' }, session: {} };
          if (path.endsWith('/me/notebook-items')) json = { items: [], total: 0 };
          if (path.endsWith('/me/srs/due')) json = { items: cards, totalCount: cards.length };
          if (path.endsWith('/me/srs/reviews')) {
            if (offline) { await route.abort('failed'); return; }
            const body = route.request().postDataJSON() as typeof reviews[number];
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
        await expect(page.getByTestId('rating-good-button')).toContainText('Dự kiến sau 15 ngày');
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
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect(errors).toEqual([]);
        // Switching accounts must not restore another learner's drafts or daily progress.
        reviews = [];
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
