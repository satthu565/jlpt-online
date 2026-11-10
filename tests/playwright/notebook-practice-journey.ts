import { test, expect, type Page } from '@playwright/test';

const fixtures = [
  { id: 'practice-school', kind: 'vocab', term: '学校', reading: 'がっこう', meaning: 'Trường học', mastered: false, tags: ['nhà trường'], sourceExam: 'N5 7/2025', examples: ['学校へ行きます。'], notes: 'Phân biệt với 学生.' },
  { id: 'practice-teacher', kind: 'vocab', term: '先生', reading: 'せんせい', meaning: 'Giáo viên', mastered: true, tags: [], sourceExam: 'N3 7/2025' },
  { id: 'practice-library', kind: 'vocab', term: '図書館', reading: 'としょかん', meaning: 'Thư viện', mastered: false, tags: [] },
  { id: 'practice-grammar-a', kind: 'grammar', term: 'から', meaning: 'Vì', mastered: false, tags: [] },
  { id: 'practice-grammar-b', kind: 'grammar', term: 'ても', meaning: 'Dù', mastered: false, tags: [] },
].map(item => ({ ...item, version: 1, createdAt: '2026-11-10T00:00:00Z', updatedAt: '2026-11-10T00:00:00Z' }));

async function openPractice(page: Page) {
  await page.goto('/so-tay', { waitUntil: 'networkidle' });
  const cookies = page.getByRole('button', { name: 'Từ chối cookie phân tích', exact: true });
  if (await cookies.isVisible()) await cookies.click();
  await page.locator('#tab-quiz').click();
  await expect(page.getByTestId('quiz-start')).toBeVisible();
}
async function choose(page: Page, label: string, option: string) {
  const trigger = page.getByRole('button', { name: label, exact: false });
  if (await trigger.count()) await trigger.click();
  else await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
async function answerCorrectly(page: Page, reading = false) {
  const term = await page.getByTestId('quiz-term').innerText();
  const entry = fixtures.find(item => item.term === term)!;
  const answer = reading ? entry.reading! : entry.meaning;
  const options = page.locator('[data-testid^="quiz-option-"]');
  const labels = await options.allTextContents();
  await options.nth(labels.findIndex(text => text.includes(answer))).click();
  await page.getByTestId('quiz-check').click();
}

export function registerNotebookPracticeTests(): void {
  test.describe('Notebook practice study flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.route('**/api/v1/**', async route => {
        const path = new URL(route.request().url()).pathname;
        let json: unknown = { items: [] };
        if (path.endsWith('/auth/session')) json = { user: { id: 'notebook-practice-learner', name: 'Practice', role: 'student' }, session: {} };
        if (path.endsWith('/me/notebook-items')) json = { items: fixtures, total: fixtures.length };
        await route.fulfill({ json });
      });
    });
    for (const width of [390, 1366]) {
      test('confirmed answers, resume, wrong-only retry and fresh rounds at ' + width + 'px', async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        const errors: string[] = [];
        const writes: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('request', request => { if (request.url().includes('/api/v1/') && request.method() === 'POST') writes.push(request.url()); });
        await openPractice(page);
        await choose(page, 'Loại nội dung', 'Từ vựng');
        await choose(page, 'Độ dài lượt luyện', '5 câu');
        await expect(page.getByTestId('quiz-available')).toHaveText('Có 3 câu phù hợp có thể luyện.');
        await page.getByTestId('quiz-start').click();
        await expect(page.getByTestId('quiz-check')).toBeDisabled();
        await page.getByTestId('quiz-option-0').click();
        await expect(page.getByTestId('quiz-feedback')).toHaveCount(0);
        await expect(page.getByTestId('quiz-option-0')).toHaveAttribute('aria-pressed', 'true');
        await page.reload({ waitUntil: 'networkidle' });
        await page.locator('#tab-quiz').click();
        await page.getByTestId('quiz-resume').click();
        await expect(page.getByTestId('quiz-feedback')).toHaveCount(0);
        await expect(page.getByTestId('quiz-option-0')).toHaveAttribute('aria-pressed', 'true');
        await page.getByTestId('quiz-dont-know').click();
        await expect(page.getByTestId('quiz-feedback')).toContainText('Đáp án đúng');
        await page.reload({ waitUntil: 'networkidle' });
        await page.locator('#tab-quiz').click();
        await page.getByTestId('quiz-resume').click();
        await expect(page.getByTestId('quiz-feedback')).toBeVisible();
        await page.getByTestId('quiz-next-button').click();
        for (let i = 0; i < 2; i++) {
          await answerCorrectly(page);
          await page.getByTestId('quiz-next-button').click();
        }
        await expect(page.getByTestId('quiz-score')).toHaveText('Đúng 2 / 3 câu');
        await expect(page.getByTestId('quiz-retry-wrong')).toContainText('1 câu');
        await page.getByTestId('quiz-retry-wrong').click();
        await answerCorrectly(page);
        await page.getByTestId('quiz-next-button').click();
        await expect(page.getByTestId('quiz-score')).toHaveText('Đúng 1 / 1 câu');
        await expect(page.getByTestId('quiz-initial-score')).toHaveText('Lượt đầu: đúng 2 / 3 câu');
        await expect(page.getByTestId('quiz-retry-wrong')).toHaveCount(0);
        await page.getByTestId('quiz-new-lesson').click();
        await page.getByTestId('quiz-start').click();
        await expect(page.getByTestId('quiz-term')).toBeVisible();
        await expect(page.getByTestId('quiz-feedback')).toHaveCount(0);
        expect(writes).toEqual([]);
        expect(errors).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      });
    }
    test('number keys change the selection and Enter confirms once from an option', async ({ page }) => {
      await openPractice(page);
      await page.getByTestId('quiz-start').click();
      await page.getByTestId('quiz-term').focus();
      await page.keyboard.press('1');
      await expect(page.getByTestId('quiz-option-0')).toHaveAttribute('aria-pressed', 'true');
      await page.getByTestId('quiz-option-0').focus();
      await page.keyboard.press('2');
      await expect(page.getByTestId('quiz-option-1')).toHaveAttribute('aria-pressed', 'true');
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('quiz-feedback')).toBeVisible();
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('jlpt_notebook_practice_v1:notebook-practice-learner')!));
      expect(saved.session.answers).toHaveLength(1);
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('quiz-feedback')).toHaveCount(0);
      await expect(page.getByTestId('notebook-quiz-view')).toContainText('Câu 2 / 5');
    });
    test('filters combine, reading format, replacement confirmation and account isolation', async ({ page }) => {
      await openPractice(page);
      await choose(page, 'Loại nội dung', 'Từ vựng');
      await choose(page, 'Cách luyện', 'Chọn cách đọc');
      await page.getByTestId('quiz-extra-filters-toggle').click();
      await choose(page, 'Cấp độ đề nguồn', 'N5');
      await choose(page, 'Trạng thái ghi nhớ', 'Chưa thuộc');
      await choose(page, 'Nhãn sổ tay', 'nhà trường');
      await expect(page.getByTestId('quiz-available')).toHaveText('Có 1 câu phù hợp có thể luyện.');
      await page.getByTestId('quiz-start').click();
      await expect(page.getByTestId('quiz-term')).toHaveText('学校');
      await expect(page.getByTestId('notebook-quiz-view')).not.toContainText('がっこう ·');
      await page.getByRole('button', { name: 'Chọn bài khác', exact: true }).click();
      await page.getByTestId('quiz-start').click();
      await expect(page.getByRole('dialog')).toContainText('Bạn còn lượt luyện chưa hoàn thành.');
      await page.getByRole('dialog').getByRole('button', { name: 'Hủy', exact: true }).last().click();
      await page.getByTestId('quiz-resume').click();
      await answerCorrectly(page, true);
      await page.getByTestId('quiz-next-button').click();
      await expect(page.getByTestId('quiz-score')).toHaveText('Đúng 1 / 1 câu');
      await page.route('**/auth/session', route => route.fulfill({ json: { user: { id: 'other-practice-learner', name: 'Other', role: 'student' }, session: {} } }));
      await page.reload({ waitUntil: 'networkidle' });
      await page.locator('#tab-quiz').click();
      await expect(page.getByTestId('quiz-resume')).toHaveCount(0);
      await expect(page.getByTestId('quiz-available')).toHaveText('Có 5 câu phù hợp có thể luyện.');
    });
    test('storage failures are visible and do not prevent answering; corrupt drafts recover safely', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('jlpt_notebook_practice_v1:notebook-practice-learner', 'bad-json');
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key.startsWith('jlpt_notebook_practice_v1:')) throw new DOMException('Full', 'QuotaExceededError');
          original.call(this, key, value);
        };
      });
      await openPractice(page);
      await expect(page.getByTestId('notebook-quiz-view')).toContainText('Bản lưu cũ không đọc được');
      await page.getByTestId('quiz-start').click();
      await expect(page.getByTestId('notebook-quiz-view')).toContainText('Trình duyệt không lưu được tiến độ.');
      await answerCorrectly(page);
      await expect(page.getByTestId('quiz-feedback')).toContainText('Chính xác');
    });
    test('empty notebook, load failure and retry do not manufacture a completed round', async ({ page }) => {
      let fail = true;
      await page.route('**/me/notebook-items?**', async route => {
        if (fail) await route.fulfill({ status: 503, json: { message: 'Unavailable' } });
        else await route.fulfill({ json: { items: [], total: 0 } });
      });
      await openPractice(page);
      await expect(page.getByTestId('notebook-quiz-view')).toContainText('Không tải được sổ tay.');
      await expect(page.getByTestId('quiz-start')).toBeDisabled();
      fail = false;
      await page.getByTestId('notebook-quiz-view').getByRole('button', { name: 'Thử lại', exact: true }).click();
      await expect(page.getByTestId('notebook-quiz-view')).toContainText('Sổ tay chưa có nội dung.');
      await expect(page.getByTestId('quiz-start')).toBeDisabled();
      await expect(page.getByTestId('quiz-results-card')).toHaveCount(0);
    });
  });
}
