import { test, expect } from '@playwright/test';

test.use({ actionTimeout: 10000, reducedMotion: 'reduce' });

for (const width of [390, 1366]) {
  test(`additional examples report access errors and allow retry at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const item = {
      id: 'saved', userId: 'user', kind: 'vocab', term: '早い', meaning: 'sớm',
      sourceExam: 'JLPT N4 7/2024', sourceQid: 'source', sourceSentence: 'もう少し早いほうがいいです。',
      mastered: false, tags: [], version: 1,
    };
    let blocked = true;
    let calls = 0;
    await page.route('**/api/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.includes('/vocabulary/')) {
        calls++;
        if (blocked) {
          await route.fulfill({ status: 403, json: { error: { code: 'FORBIDDEN', message: 'Access denied.' } } });
        } else {
          await route.fulfill({ json: [{ id: 'other', examTitle: 'JLPT N5 7/2025', level: 'N5', skill: 'vocabulary', stemText: '朝が早い。' }] });
        }
        return;
      }
      let body: unknown = {};
      if (path.endsWith('/auth/session')) body = { user: { id: 'user', email: 'notebook@example.test' }, session: null };
      if (path.endsWith('/me/notebook-items')) body = { items: [item], totalCount: 1 };
      if (path.endsWith('/me/srs/due')) body = { items: [], totalCount: 0 };
      if (path.endsWith('/question-examples')) body = { examples: [{ questionId: 'source', stem: item.sourceSentence, isSavedSource: true, examTitle: item.sourceExam }] };
      await route.fulfill({ json: body });
    });
    await page.goto('/so-tay');
    await page.getByTestId('notebook-item-saved').getByRole('button', { name: 'Ví dụ trong đề' }).click();
    const moreButton = page.getByRole('button', { name: 'Xem thêm ví dụ trong các đề khác' });
    await moreButton.click();
    await expect(page.getByText('Bạn chưa được phép xem thêm câu hỏi.', { exact: false })).toBeVisible();
    await expect(page.getByText('Không tìm thấy thêm câu hỏi', { exact: false })).toHaveCount(0);
    await expect(moreButton).toBeEnabled();
    expect(calls).toBe(1);
    await page.screenshot({ path: testInfo.outputPath('blocked.png'), fullPage: true });
    blocked = false;
    await moreButton.click();
    await expect(page.getByText('朝が早い。', { exact: true })).toBeVisible();
    await expect(page.getByText('Đã tải thêm 1 câu hỏi', { exact: false })).toBeVisible();
    await expect(page.getByText('Bạn chưa được phép xem thêm câu hỏi.', { exact: false })).toHaveCount(0);
    expect(calls).toBe(2);
    await page.screenshot({ path: testInfo.outputPath('loaded.png'), fullPage: true });
  });
}
