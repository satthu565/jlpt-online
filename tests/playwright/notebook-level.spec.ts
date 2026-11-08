import { test, expect } from '@playwright/test';

test.use({ actionTimeout: 10000, reducedMotion: 'reduce' });

for (const width of [390, 1366]) {
  test(`notebook exam level combines with kind, status and search at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const baseItem = {
      userId: 'notebook-test-user', kind: 'vocab', meaning: 'meaning', mastered: false,
      tags: [], version: 1, createdAt: '2026-11-07T00:00:00Z', updatedAt: '2026-11-07T00:00:00Z',
    };
    const items = [
      { ...baseItem, id: 'n3-vocab', term: '勉強', sourceExam: 'N3 7/2025', sourceQnum: 2 },
      { ...baseItem, id: 'n3-grammar', term: 'ために', kind: 'grammar', mastered: true, tags: ['source_exam:N3 12/2024', 'source_qnum:12'] },
      { ...baseItem, id: 'n5-vocab', term: '学校', sourceExam: 'N5 7/2025' },
      { ...baseItem, id: 'manual', term: '手動', tags: ['level:N3'] },
    ];
    await page.route('**/api/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown = {};
      if (path.endsWith('/auth/session')) {
        body = { user: { id: 'notebook-test-user', email: 'notebook@example.test', displayName: 'Notebook test', roles: ['learner'] }, session: null };
      } else if (path.endsWith('/me/notebook-items')) {
        body = { items, totalCount: items.length };
      } else if (path.endsWith('/me/srs/due')) {
        body = { items: [], totalCount: 0 };
      }
      await route.fulfill({ json: body });
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/so-tay');
    const cards = page.locator('[data-testid^="notebook-item-"]');
    await expect(cards).toHaveCount(4);
    await expect(page.getByTestId('notebook-item-n3-vocab').getByTestId('notebook-source')).toContainText('N3 7/2025');
    await expect(page.getByTestId('notebook-item-n3-vocab').getByTestId('notebook-source')).toContainText('Câu 2');
    await expect(page.getByTestId('notebook-item-n3-grammar').getByTestId('notebook-source')).toContainText('Câu 12');
    await expect(page.getByTestId('notebook-item-manual').getByTestId('notebook-source')).toHaveCount(0);
    const choose = async (label: string, option: string) => {
      await page.getByRole('button', { name: new RegExp(label + '$') }).click();
      await page.getByRole('option', { name: option, exact: true }).click();
    };
    await choose('Cấp độ đề thi', 'N3');
    await expect(cards).toHaveCount(2);
    await expect(page.getByTestId('notebook-item-manual')).toHaveCount(0);
    await choose('Loại kiến thức', 'Ngữ pháp');
    await expect(cards).toHaveCount(1);
    await expect(page.getByTestId('notebook-item-n3-grammar')).toBeVisible();
    await choose('Trạng thái', 'Đang học');
    await expect(cards).toHaveCount(0);
    await choose('Trạng thái', 'Tất cả trạng thái');
    await choose('Loại kiến thức', 'Tất cả loại');
    await page.getByRole('textbox', { name: 'Tìm kiếm từ hoặc nghĩa' }).fill('勉強');
    await expect(cards).toHaveCount(1);
    await page.getByRole('textbox', { name: 'Tìm kiếm từ hoặc nghĩa' }).clear();
    await choose('Cấp độ đề thi', 'N1');
    await expect(cards).toHaveCount(0);
    await choose('Cấp độ đề thi', 'Tất cả cấp độ');
    await expect(cards).toHaveCount(4);
    await expect(page.getByRole('button', { name: /Cấp độ đề thi$/ })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('notebook.png'), fullPage: true });
    await page.getByRole('button', { name: /Cấp độ đề thi$/ }).click();
    await expect(page.getByRole('option', { name: 'N1', exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('levels.png'), fullPage: true });
    expect(await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth))).toBeLessThanOrEqual(width);
    expect(errors).toEqual([]);
  });
}
