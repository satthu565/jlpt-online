import { createHash, randomUUID } from 'node:crypto';
import { test as base, expect } from '@playwright/test';
import type { PublicExamSnapshot } from '@jlpt/schema';

const test = base.extend({
  extraHTTPHeaders: async ({ baseURL }, use, info) => {
    const hash = createHash('sha256').update(`${info.testId}:${info.retry}:${baseURL}`).digest();
    const ip = `198.18.${hash[0]}.${Math.max(1, hash[1]!)}`;
    await use({ 'x-forwarded-for': ip, 'cf-connecting-ip': ip });
  },
});

export function registerExamContentTests(): void {
  test.describe('Original shell with HTML booklet workspace', () => {
    for (const mode of ['real', 'practice'] as const) {
      test(`${mode}: original controls, source content, save and resume`, async ({ page, context, baseURL }, info) => {
        test.setTimeout(120000);
        const origin = baseURL ?? 'http://127.0.0.1:3000';
        await page.setViewportSize({ width: info.project.use.isMobile ? 390 : 1366, height: 900 });
        await context.addCookies([{ name: 'guest_id', value: randomUUID(), url: origin }, { name: 'jlpt_consent', value: 'necessary', url: origin }]);
        await context.addInitScript(() => localStorage.setItem('jlpt_cookie_consent', 'necessary'));
        let exam: { id: string; slug: string } | undefined;
        // I03 briefly takes down this shared fixture to verify the publish flow.
        // Wait for its public state instead of racing that independent browser.
        await expect.poll(async () => {
          const response = await context.request.get(`${origin}/api/v1/exams`);
          expect(response.ok()).toBe(true);
          const list = await response.json() as { items: Array<{ id: string; slug: string }> };
          exam = list.items.find(item => item.slug === 'demo-n5-1');
          return Boolean(exam);
        }, { timeout: 60000, intervals: [500, 1000, 2000] }).toBe(true);
        const created = await context.request.post(`${origin}/api/v1/attempts`, { data: { examId: exam!.id, mode } });
        expect(created.status()).toBe(201);
        const attempt = await created.json() as { attemptId: string; snapshotUrl: string };
        const sourceUrl = new URL(attempt.snapshotUrl, origin);
        const published = await (await context.request.get(`${origin}${sourceUrl.pathname}${sourceUrl.search}`)).json() as PublicExamSnapshot;
        const passageIndex = published.sections.flatMap(section => section.groups.flatMap(group => group.questions.map(() => Boolean(group.passage?.length)))).indexOf(true);
        try {
          await page.goto(`${origin}/phong-thi?attemptId=${attempt.attemptId}&mode=${mode}`);
          const card = page.getByTestId('paper-question-0');
          await expect(page.locator('.paper-question')).toHaveCount(published.sections[0]!.questionRange[1] + 1);
          await expect(page.locator('.jlpt-exam-toolbar')).toBeVisible();
          await expect(page.locator('.jlpt-section-header')).toBeVisible();
          await expect(page.locator('.paper-booklet')).toBeVisible();
          await expect(page.locator('.jlpt-question-card')).toHaveCount(0);
          await page.getByRole('button', { name: 'Hiển thị', exact: true }).click();
          const lookup = page.getByTestId('select-lookup-switch');
          await expect(lookup.getByRole('switch')).toBeChecked();
          await lookup.locator('.switch__control').click();
          await expect(lookup.getByRole('switch')).not.toBeChecked();
          await page.keyboard.press('Escape');
          await card.locator('.radio__content').first().click();
          await card.getByRole('button', { name: 'Đánh dấu xem lại câu 1', exact: true }).click();
          await card.getByRole('button', { name: 'Ghi nháp', exact: true }).click();
          await card.locator('textarea').fill('Review this word after the exam');
          await page.getByTestId('paper-question-1').locator('.radio__content').nth(1).click();
          await expect(card.getByRole('radio').first()).toBeChecked();
          await expect(page.locator('[role="status"]').filter({ hasText: 'Đã lưu' })).toBeVisible({ timeout: 15000 });
          await page.reload();
          await page.getByRole('button', { name: 'Hiển thị', exact: true }).click();
          await expect(lookup.getByRole('switch')).not.toBeChecked();
          await lookup.locator('.switch__control').click();
          await expect(lookup.getByRole('switch')).toBeChecked();
          await page.keyboard.press('Escape');
          await expect(card.getByRole('radio').first()).toBeChecked();
          await expect(page.getByTestId('paper-question-1').getByRole('radio').nth(1)).toBeChecked();
          await expect(card.getByRole('button', { name: /Bỏ đánh dấu xem lại/ })).toHaveAttribute('aria-pressed', 'true');
          await card.getByRole('button', { name: 'Ghi nháp', exact: true }).click();
          await expect(card.locator('textarea')).toHaveValue('Review this word after the exam');
          if (info.project.use.isMobile) await page.locator('.paper-mobile-bar').getByRole('button', { name: 'Phiếu trả lời', exact: true }).click();
          const sheet = info.project.use.isMobile ? page.getByRole('dialog').locator('.paper-answer-sheet') : page.locator('.paper-sticky-sheet .paper-answer-sheet');
          await expect(sheet).toBeVisible();
          await sheet.getByTestId('paper-answer-row-0').locator('.radio__content').first().click();
          await expect(sheet.getByTestId('paper-answer-row-0').getByRole('radio').first()).toBeChecked();
          await sheet.getByRole('button', { name: 'Đến câu 2', exact: true }).click();
          if (!info.project.use.isMobile) {
            await page.evaluate(() => window.scrollBy(0, 900));
            const rect = await sheet.boundingBox();
            expect(rect!.y).toBeGreaterThanOrEqual(0);
            const header = await page.locator('.exam-session-header').boundingBox();
            const site = await page.locator('.jlpt-header').boundingBox();
            expect(header!.y).toBeGreaterThanOrEqual(site!.y + site!.height - 1);
            const sticky = await page.locator('.paper-sticky-sheet').boundingBox();
            expect(sticky!.y).toBeCloseTo(header!.y + header!.height + 16, 0);
            expect(rect!.y + rect!.height).toBeLessThanOrEqual(900);
          }
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({ path: info.outputPath(`hybrid-ui-${mode}.png`), fullPage: false });
          if (mode === 'practice') {
            expect(passageIndex).toBeGreaterThanOrEqual(0);
            const sectionIndex = published.sections.findIndex(section => section.questionRange[0] <= passageIndex && section.questionRange[1] >= passageIndex);
            for (let index = 0; index < sectionIndex; index++) {
              await page.getByTestId('finish-section-btn').click();
              await page.getByRole('button', { name: 'Xác nhận chuyển phần', exact: true }).click();
              await expect(page.locator('.jlpt-section-header [role="tab"][aria-selected="true"]')).toContainText(published.sections[index + 1]!.title);
            }
            await expect(page.locator('.paper-passage').first()).toBeAttached();
            await page.locator('.paper-passage').first().scrollIntoViewIfNeeded();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
            await page.screenshot({ path: info.outputPath('hybrid-ui-reading.png'), fullPage: false });
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
