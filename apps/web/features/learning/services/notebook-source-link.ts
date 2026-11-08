import type { NotebookItem } from '../types';

export function getNotebookSourceHref(item: NotebookItem): string {
  const tag = (prefix: string) => item.tags.map((value) => value.replace(/^#+/, ''))
    .find((value) => value.startsWith(prefix))?.slice(prefix.length);
  const attemptId = item.sourceAttemptId || tag('source_attempt_id:');
  const examId = item.sourceExamId || tag('source_exam_id:');
  const questionId = item.sourceQid || tag('source_qid:');
  const questionNumber = item.sourceQnum ?? tag('source_qnum:');
  const params = new URLSearchParams();
  if (questionId) params.set('questionId', questionId);
  if (questionNumber !== undefined && String(questionNumber).trim()) params.set('questionNumber', String(questionNumber));
  if (attemptId) return `/ket-qua/${encodeURIComponent(attemptId)}?${params}`;
  if (item.createdAt && Number.isFinite(Date.parse(item.createdAt))) params.set('sourceSavedAt', item.createdAt);
  if (examId) params.set('sourceExamId', examId);
  const exam = item.sourceExam || tag('source_exam:');
  if (exam) params.set('sourceExam', exam);
  return `/lich-su?${params}`;
}

export function getSourceAttemptDestination(
  attempt: { id: string; status: string },
  sourceParams: URLSearchParams,
): string | undefined {
  const target = new URLSearchParams();
  for (const key of ['questionId', 'questionNumber']) {
    const value = sourceParams.get(key);
    if (value) target.set(key, value);
  }
  if (attempt.status === 'submitted') {
    return `/ket-qua/${encodeURIComponent(attempt.id)}${target.size ? `?${target}` : ''}`;
  }
  if (attempt.status === 'in_progress') {
    target.set('attemptId', attempt.id);
    return `/phong-thi?${target}`;
  }
  return undefined;
}

export function resolveNotebookAttempt<T extends { id: string; startedAt: string; submittedAt?: string | null; status: string }>(
  items: T[], attemptId?: string | null, savedAtText?: string | null,
): T | undefined {
  const unique = [...new Map(items.map((item) => [item.id, item])).values()];
  if (attemptId) return unique.find((item) => item.id === attemptId);
  const savedAt = Date.parse(savedAtText ?? '');
  const matchingTime = Number.isFinite(savedAt) ? unique.filter((item) =>
    Date.parse(item.startedAt) <= savedAt && (item.submittedAt
      ? Date.parse(item.submittedAt) >= savedAt : item.status === 'in_progress')) : [];
  if (matchingTime.length === 1) return matchingTime[0];
  return unique.length === 1 ? unique[0] : undefined;
}
