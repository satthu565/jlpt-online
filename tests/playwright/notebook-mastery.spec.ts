import { test, expect } from '@playwright/test';

for (const width of [390, 1366]) {
  test(`notebook mastery label and icon follow the saved state at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    let mastered = false;
    const updates: boolean[] = [];
    const item = () => ({ id: 'mastery', userId: 'user', kind: 'grammar', term: '〜によると', meaning: 'Theo nguồn tin', mastered, tags: [], version: 1 });
    await page.route('**/api/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown = {};
      if (path.endsWith('/auth/session')) body = { user: { id: 'user', email: 'notebook@example.test' }, session: null };
      else if (path.endsWith('/me/notebook-items/mastery')) {
        expect(route.request().method()).toBe('PATCH');
        mastered = route.request().postDataJSON().mastered;
        updates.push(mastered);
        body = item();
      } else if (path.endsWith('/me/notebook-items')) body = { items: [item()], totalCount: 1 };
      else if (path.endsWith('/me/srs/due')) body = { items: [] };
      await route.fulfill({ json: body });
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/so-tay');
    const rejectCookies = page.getByRole('button', { name: 'Từ chối cookie phân tích' });
    if (await rejectCookies.isVisible()) await rejectCookies.click();
    const card = page.getByTestId('notebook-item-mastery');
    const button = card.locator('.notebook-mastery');
    await expect(button).toHaveText('Chưa thuộc');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button.locator('.lucide-circle')).toBeVisible();
    await button.focus();
    await expect(page.getByRole('tooltip')).toHaveText('Đánh dấu đã thuộc');
    await page.keyboard.press('Escape');
    await card.screenshot({ path: testInfo.outputPath('not-mastered.png') });
    await button.click();
    await expect(button).toHaveText('Đã thuộc');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button.locator('.lucide-circle-check')).toBeVisible();
    expect(updates).toEqual([true]);
    await page.reload();
    await expect(button).toHaveText('Đã thuộc');
    await button.focus();
    await expect(page.getByRole('tooltip')).toHaveText('Chuyển về chưa thuộc');
    await page.keyboard.press('Escape');
    await card.screenshot({ path: testInfo.outputPath('mastered.png') });
    await button.click();
    await expect(button).toHaveText('Chưa thuộc');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(updates).toEqual([true, false]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(errors).toEqual([]);
  });
}
