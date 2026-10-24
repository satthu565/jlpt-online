import { createHash, randomUUID } from 'node:crypto';
import { test as base, expect } from '@playwright/test';

const test = base.extend({
  extraHTTPHeaders: async ({ baseURL }, use, info) => {
    const hash = createHash('sha256').update(`${info.testId}:${info.retry}:${baseURL}`).digest();
    const ip = `198.18.${hash[0]}.${Math.max(1, hash[1]!)}`;
    await use({ 'x-forwarded-for': ip, 'cf-connecting-ip': ip });
  },
});

export function registerExamContentTests(): void {
  test.describe('Original exam UI with source HTML content', () => {
    for (const mode of ['real', 'practice'] as const) {
      test(`${mode}: original controls, source content, save and resume`, async ({ page, context, baseURL }, info) => {
        test.setTimeout(90000);
        const origin = baseURL ?? 'http://127.0.0.1:3000';
        await page.setViewportSize({ width: info.project.use.isMobile ? 390 : 1366, height: 900 });
        await context.addCookies([{ name: 'guest_id', value: randomUUID(), url: origin }, { name: 'jlpt_consent', value: 'necessary', url: origin }]);
        await context.addInitScript(() => localStorage.setItem('jlpt_cookie_consent', 'necessary'));
        const list = await (await context.request.get(`${origin}/api/v1/exams`)).json() as { items: Array<{ id: string; slug: string }> };
        const exam = list.items.find(item => item.slug === 'demo-n5-1');
        expect(exam).toBeDefined();
        const created = await context.request.post(`${origin}/api/v1/attempts`, { data: { examId: exam!.id, mode } });
        expect(created.status()).toBe(201);
        const attempt = await created.json() as { attemptId: string };
        try {
          await page.goto(`${origin}/phong-thi?attemptId=${attempt.attemptId}&mode=${mode}`);
          const card = page.locator('.jlpt-question-card');
          await expect(card).toHaveCount(1);
          await expect(page.locator('.jlpt-exam-toolbar')).toBeVisible();
          await expect(page.locator('.paper-booklet')).toHaveCount(0);
          await expect(card.locator('.jlpt-exam-source-text').first()).toBeVisible();
          await card.getByRole('radio').first().click();
          await card.getByRole('button', { name: /Đánh dấu xem lại câu này/ }).click();
          await page.getByRole('button', { name: 'Chuyển đến câu hỏi tiếp theo (Phím mũi tên phải)', exact: true }).click();
          await expect(card).toHaveAttribute('aria-label', 'Câu hỏi số 2');
          await page.getByRole('button', { name: 'Chuyển đến câu hỏi trước đó (Phím mũi tên trái)', exact: true }).click();
          await expect(card.getByRole('radio').first()).toHaveAttribute('aria-checked', 'true');
          await expect(page.locator('[role="status"]').filter({ hasText: 'Đã lưu' })).toBeVisible({ timeout: 15000 });
          await page.reload();
          await expect(card.getByRole('radio').first()).toHaveAttribute('aria-checked', 'true');
          await expect(card.getByRole('button', { name: /Bỏ đánh dấu xem lại/ })).toHaveAttribute('aria-pressed', 'true');
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
          await page.screenshot({ path: info.outputPath(`original-ui-${mode}.png`), fullPage: true });
          if (mode === 'practice') {
            await page.locator('[data-question-index="12"]').click();
            await expect(card.locator('.jlpt-exam-source-passage')).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
            await page.screenshot({ path: info.outputPath('original-ui-reading.png'), fullPage: true });
          }
          await page.getByTestId('submit-exam-btn').click();
          await page.getByTestId('modal-confirm-submit-btn').click();
          await expect(page.locator('a[href*="/ket-qua/"]').first()).toBeVisible();
        } finally {
          const response = await context.request.post(`${origin}/api/v1/attempts/${attempt.attemptId}/resume`, { data: {} });
          if (response.ok()) {
            const saved = await response.json() as { lease: string; lastSeq: number; answers: number[]; flags: number[] };
            await context.request.post(`${origin}/api/v1/attempts/${attempt.attemptId}/submit`, { data: { lease: saved.lease, seq: saved.lastSeq + 1, answers: saved.answers, flags: saved.flags } });
          }
        }
      });
    }
  });
}
