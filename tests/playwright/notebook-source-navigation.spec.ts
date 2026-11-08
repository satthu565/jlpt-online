import { test, expect } from '@playwright/test';
import { SAMPLE_N1_EXAM_SNAPSHOT } from '../../apps/web/tests/fixtures/exam-fixtures';

test.use({ actionTimeout: 15000, reducedMotion: 'reduce' });
for (const kind of ['vocab', 'grammar', 'legacy', 'legacy-single']) {
  test(`saved ${kind} opens original attempt and question 12 after history pagination`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: kind === 'grammar' ? 390 : 1366, height: 900 });
    const template = SAMPLE_N1_EXAM_SNAPSHOT.sections[0]!.groups[0]!.questions[0]!;
    const questions = Array.from({ length: 12 }, (_, index) => ({ ...template, index, questionId: `question-${index + 1}`, number: String(index + 1), stem: [{ t: 'text', text: `問題 ${index + 1} 早いです。` }] }));
    const snapshot = { ...SAMPLE_N1_EXAM_SNAPSHOT, examId: 'source-exam', title: 'JLPT N4 7/2024', level: 'N4', totalQuestions: 12, sections: [{ ...SAMPLE_N1_EXAM_SNAPSHOT.sections[0], index: 0, questionRange: [0, 11], groups: [{ ...SAMPLE_N1_EXAM_SNAPSHOT.sections[0]!.groups[0], questions }] }] };
    const sourceItem = { id: 'saved', userId: 'user', kind: kind.startsWith('legacy') ? 'vocab' : kind, term: '学校', meaning: 'trường học', mastered: false, tags: [], sourceAttemptId: kind.startsWith('legacy') ? undefined : 'original', sourceExamId: 'source-exam', sourceExam: snapshot.title, sourceQid: 'question-12', sourceQnum: 12, version: 1 };
    let savedInput: { tags?: string[] } | undefined;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      let body: unknown = {};
      if (path.endsWith('/auth/session')) body = { user: { id: 'user', email: 'learner@example.test' }, session: null };
      else if (path.endsWith('/me/notebook-items')) {
        if (route.request().method() === 'POST') {
          savedInput = route.request().postDataJSON();
          body = { id: 'new-word', ...savedInput };
        } else if (url.searchParams.has('search')) body = { items: savedInput ? [{ ...sourceItem, id: 'new-word', term: '早い' }] : [], totalCount: savedInput ? 1 : 0 };
        else body = { items: [sourceItem], totalCount: 1 };
      }
      else if (path.endsWith('/dictionary/lookup')) body = { entry: '早い', readings: ['はやい'], meanings: ['sớm'], examples: [], synonyms: [], antonyms: [] };
      else if (path.endsWith('/me/srs/due')) body = { items: [] };
      else if (path.endsWith('/exams')) body = { items: [{ id: 'source-exam', title: snapshot.title, level: 'N4' }] };
      else if (path.endsWith('/me/attempts')) body = { items: [{ id: url.searchParams.has('cursor') || kind === 'legacy-single' ? 'original' : 'newer-attempt', examId: 'source-exam', status: 'submitted', mode: 'real', startedAt: '2026-11-01T00:00:00Z', submittedAt: '2026-11-01T01:00:00Z', score: 80 }], nextCursor: url.searchParams.has('cursor') || kind === 'legacy-single' ? null : 'page-2' };
      else if (path.endsWith('/attempts/original/review')) body = { snapshotUrl: '/api/v1/navigation-test-snapshot', answers: Array(12).fill(1), flags: Array(12).fill(0), correct: Array(12).fill(1), result: { accuracy: 100, totals: { correct: 12, total: 12, wrong: 0, blank: 0 }, bySkill: [], scoring: { sections: [], total: 80, totalMax: 180, totalPass: 80, passEstimate: true }, flags: [] } };
      else if (path.endsWith('/navigation-test-snapshot')) body = snapshot;
      await route.fulfill({ json: body });
    });
    await page.goto('/so-tay');
    await page.getByTestId('notebook-item-saved').getByRole('link', { name: 'Xem lại bài làm: JLPT N4 7/2024' }).click();
    if (kind === 'legacy') {
      await expect(page).toHaveURL(/\/lich-su\?/);
      await page.locator('a[href^="/ket-qua/original?"]').click();
    }
    await expect(page).toHaveURL(/\/ket-qua\/original\?/);
    await expect(page.locator('#review-question-11')).toBeFocused();
    await expect(page.locator('#review-question-11')).toBeInViewport();
    expect(new URL(page.url()).searchParams.get('questionId')).toBe('question-12');
    await page.screenshot({ path: testInfo.outputPath('source-question.png') });
    if (kind === 'vocab') {
      await page.locator('#review-question-11').evaluate((element) => {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const start = node.textContent?.indexOf('早い') ?? -1;
          if (start < 0) continue;
          const range = document.createRange();
          range.setStart(node, start);
          range.setEnd(node, start + 2);
          const selection = window.getSelection()!;
          selection.removeAllRanges();
          selection.addRange(range);
          element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          break;
        }
      });
      await page.getByTestId('save-to-notebook-btn').click();
      await expect.poll(() => savedInput?.tags).toContain('source_attempt_id:original');
      expect(savedInput?.tags).toContain('source_qid:question-12');
      expect(savedInput?.tags).toContain('source_qnum:12');
      expect(savedInput?.tags).toContain('source_exam_id:source-exam');
    }
    expect(errors).toEqual([]);
  });
}
