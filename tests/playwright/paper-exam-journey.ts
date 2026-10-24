import { createHash, randomUUID } from 'node:crypto';
import { test as base, expect } from '@playwright/test';

const test = base.extend({
  extraHTTPHeaders: async ({}, use, testInfo) => {
    const hash = createHash('sha256').update(`${testInfo.testId}:${testInfo.retry}`).digest();
    const ip = `198.18.${hash[0]}.${Math.max(1, hash[1]!)}`;
    await use({ 'x-forwarded-for': ip, 'cf-connecting-ip': ip });
  },
});

/** Runs only against published content and real attempt APIs; no browser response stubs. */
export function registerPaperExamTests(): void {
  test.describe('Paper exam room with real API', () => {
    test('reading reference, practice tools and explicit handling of listening data', async ({ page, context, baseURL }, testInfo) => {
      test.setTimeout(90000);
      const origin = baseURL ?? 'http://127.0.0.1:3000';
      await context.addCookies([{ name: 'jlpt_consent', value: 'necessary', url: origin }, { name: 'guest_id', value: randomUUID(), url: origin }]);
      await context.addInitScript(() => localStorage.setItem('jlpt_cookie_consent', 'necessary'));
      const list = await (await context.request.get(`${origin}/api/v1/exams`)).json() as { items: Array<{ id: string; slug: string }> };
      const exam = list.items.find((item) => item.slug === 'demo-n5-1');
      expect(exam).toBeDefined();
      const created = await context.request.post(`${origin}/api/v1/attempts`, { data: { examId: exam!.id, mode: 'practice' } });
      expect(created.status()).toBe(201);
      const attempt = await created.json() as { attemptId: string; snapshotUrl: string };
      const snapshotUrl = new URL(attempt.snapshotUrl, origin);
      const snapshotResponse = await context.request.get(`${origin}${snapshotUrl.pathname}${snapshotUrl.search}`);
      expect(snapshotResponse.ok()).toBe(true);
      const published = await snapshotResponse.json() as { sections: Array<{ listeningTimeline: unknown[] | null }> };
      const hasAudio = Boolean(published.sections[2]?.listeningTimeline?.length);
      try {
        await page.goto(`${origin}/phong-thi?attemptId=${attempt.attemptId}&mode=practice`);
        await expect(page.locator('.paper-booklet')).toBeVisible();
        await page.getByRole('button', { name: 'Hiển thị', exact: true }).click();
        await expect(page.getByTestId('select-lookup-switch')).toBeVisible();
        await expect(page.getByTestId('exam-clock')).toContainText('Không giới hạn thời gian');
        await page.getByTestId('finish-section-btn').click();
        await page.getByTestId('modal-confirm-submit-btn').click();
        await expect(page.getByTestId('paper-question-12')).toBeAttached();
        await page.getByRole('button', { name: 'Xem bài đọc', exact: true }).first().click();
        await expect(page.getByRole('dialog').locator('.paper-passage')).toBeVisible();
        await page.getByRole('button', { name: 'Đóng', exact: true }).click();
        await page.getByTestId('finish-section-btn').click();
        await page.getByTestId('modal-confirm-submit-btn').click();
        if (hasAudio) {
          await expect(page.getByRole('dialog', { name: 'Kiểm tra tai nghe / loa' })).toBeVisible();
          const details = await (await context.request.get(`${origin}/api/v1/attempts/${attempt.attemptId}`)).json() as { currentSection: number };
          expect(details.currentSection).toBe(1);
          await page.getByRole('button', { name: 'Phát âm thanh thử nghiệm', exact: true }).click();
          const confirm = page.getByRole('button', { name: 'Tôi nghe rõ · Bắt đầu phần nghe', exact: true });
          await expect(confirm).toBeEnabled({ timeout: 20000 });
          await confirm.click();
          await expect(page.getByRole('region', { name: 'Khung phát âm thanh bài thi nghe' })).toBeVisible();
          await expect(page.getByRole('slider', { name: 'Âm lượng' })).toBeVisible();
          await expect(page.getByRole('button', { name: 'Tốc độ phát 0.75x' })).toBeVisible();
        } else {
          await expect(page.locator('.paper-message[role="alert"]')).toContainText('chưa có timeline âm thanh');
          await expect(page.getByRole('slider', { name: 'Âm lượng' })).toHaveCount(0);
          testInfo.annotations.push({ type: 'audio-data', description: 'Published guest demo has no listening timeline; verified explicit missing-data state instead of simulating audio.' });
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

    test('booklet, review flags, notes, countdown, offline sync, reload and fixed answer sheet', async ({ page, context, baseURL }, testInfo) => {
      test.setTimeout(120000);
      const origin = baseURL ?? 'http://127.0.0.1:3000';
      const mobile = Boolean(testInfo.project.use.isMobile);
      await page.setViewportSize({ width: mobile ? 390 : 1366, height: mobile ? 844 : 900 });
      await context.addCookies([
        { name: 'jlpt_consent', value: 'necessary', url: origin },
        { name: 'guest_id', value: randomUUID(), url: origin },
      ]);
      await context.addInitScript(() => localStorage.setItem('jlpt_cookie_consent', 'necessary'));
      const list = await context.request.get(`${origin}/api/v1/exams`);
      expect(list.ok()).toBe(true);
      const exams = await list.json() as { items: Array<{ id: string; slug: string }> };
      const exam = exams.items.find((item) => item.slug === 'demo-n5-1');
      expect(exam).toBeDefined();
      const created = await context.request.post(`${origin}/api/v1/attempts`, { data: { examId: exam!.id, mode: 'real' } });
      expect(created.status()).toBe(201);
      const attempt = await created.json() as { attemptId: string };
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      try {
        await page.goto(`${origin}/phong-thi?attemptId=${attempt.attemptId}&mode=real`);
        await expect(page.locator('.paper-booklet')).toBeVisible();
        expect(await page.locator('.paper-question').count()).toBeGreaterThan(1);
        await expect(page.locator('.jlpt-header')).toBeHidden();
        await expect(page.locator('[data-select-lookup-area="true"]')).toHaveCount(0);
        const question = page.getByTestId('paper-question-0');
        const option = question.getByRole('radio').nth(1);
        await option.click();
        await option.click();
        await expect(option).toHaveAttribute('aria-checked', 'true');
        const text = question.locator('[data-paper-text]').first();
        await text.evaluate((element) => {
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          let node = walker.nextNode();
          while (node && (!node.textContent?.length || node.parentElement?.closest('rt'))) node = walker.nextNode();
          if (!node) throw new Error('No question text to select');
          const range = document.createRange();
          range.setStart(node, 0); range.setEnd(node, 1);
          const selection = window.getSelection();
          selection?.removeAllRanges(); selection?.addRange(range);
        });
        await text.dispatchEvent('pointerup');
        await question.getByRole('button', { name: 'Đánh dấu đoạn đã chọn', exact: true }).click();
        await expect(question.locator('mark')).toHaveCount(1);
        await question.getByRole('button', { name: /Đánh dấu xem lại câu/ }).click();
        await expect(question.getByRole('button', { name: /Bỏ đánh dấu xem lại câu/ })).toHaveAttribute('aria-pressed', 'true');
        await expect(question.locator('mark')).toHaveCount(1);
        await question.getByRole('button', { name: 'Ghi nháp', exact: true }).click();
        const note = question.getByRole('textbox');
        await note.fill('2 → 1 → 4 → 3');
        await note.press('1');
        await expect(option).toHaveAttribute('aria-checked', 'true');
        const clock = page.getByTestId('exam-clock');
        const before = Number(await clock.getAttribute('data-remaining-sec'));
        await expect.poll(async () => Number(await clock.getAttribute('data-remaining-sec'))).toBeLessThan(before);
        await expect(page.locator('.paper-header-sync')).toContainText('Đã đồng bộ', { timeout: 15000 });
        await page.evaluate(() => window.scrollTo(0, 1200));
        await expect.poll(async () => (await page.locator('.paper-session-header').boundingBox())?.y).toBe(0);
        if (mobile) {
          await page.locator('.paper-mobile-bar').getByRole('button', { name: 'Phiếu trả lời', exact: true }).click();
          await expect(page.getByRole('dialog')).toBeVisible();
          await page.getByRole('dialog').getByTestId('paper-answer-row-0').getByRole('button', { name: 'Đến câu 1', exact: true }).click();
          await expect(page.getByRole('dialog')).toHaveCount(0);
        } else {
          const sheet = await page.locator('.paper-sticky-sheet').boundingBox();
          const header = await page.locator('.paper-session-header').boundingBox();
          expect(sheet!.y).toBeGreaterThanOrEqual(header!.height);
          expect(sheet!.y).toBeLessThan(header!.height + 40);
        }
        await page.screenshot({ path: testInfo.outputPath('paper-exam-scrolled.png') });
        await context.setOffline(true);
        await question.getByRole('radio').nth(2).click();
        await expect(question.getByRole('radio').nth(2)).toHaveAttribute('aria-checked', 'true');
        await context.setOffline(false);
        await expect(page.locator('.paper-header-sync')).toContainText('Đã đồng bộ', { timeout: 15000 });
        await page.reload();
        await expect(question.getByRole('radio').nth(2)).toHaveAttribute('aria-checked', 'true');
        await expect(question.locator('mark')).toHaveCount(1);
        await expect(question.getByRole('button', { name: /Bỏ đánh dấu xem lại câu/ })).toHaveAttribute('aria-pressed', 'true');
        await question.getByRole('button', { name: 'Ghi nháp', exact: true }).click();
        await expect(question.getByRole('textbox')).toHaveValue('2 → 1 → 4 → 31');
        await page.getByTestId('submit-exam-btn').click();
        await expect(page.getByRole('dialog')).toContainText('kể cả các phần chưa làm');
        await page.getByTestId('modal-confirm-submit-btn').click();
        await expect(page.locator('a[href*="/ket-qua/"]').first()).toBeVisible();
        expect(errors).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      } finally {
        await context.setOffline(false);
        // Only this test's fresh guest attempt is touched by cleanup.
        const response = await context.request.post(`${origin}/api/v1/attempts/${attempt.attemptId}/resume`, { data: {} });
        if (response.ok()) {
          const saved = await response.json() as { lease: string; lastSeq: number; answers: number[]; flags: number[] };
          await context.request.post(`${origin}/api/v1/attempts/${attempt.attemptId}/submit`, { data: { lease: saved.lease, seq: saved.lastSeq + 1, answers: saved.answers, flags: saved.flags } });
        }
      }
    });
  });
}
