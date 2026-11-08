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
  if (attemptId) params.set('sourceAttemptId', attemptId);
  if (examId) params.set('sourceExamId', examId);
  const exam = item.sourceExam || tag('source_exam:');
  if (exam) params.set('sourceExam', exam);
  return `/lich-su?${params}`;
}
