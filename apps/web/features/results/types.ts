import type { PublicExamSnapshot, Result, AttemptSummary } from '@jlpt/schema';

export type ReviewFilter = 'all' | 'correct' | 'wrong' | 'blank' | 'flagged';

export interface AttemptReviewData {
  attemptId: string;
  examId: string;
  mode: 'real' | 'practice';
  snapshot: PublicExamSnapshot;
  answers: number[];
  flags: number[];
  correct: number[];
  result: Result;
  previousResult?: Result | null;
  submittedAt?: string;
}

export interface ExamHistoryItem extends AttemptSummary {
  examTitle?: string;
  examLevel?: string;
  accuracy?: number;
}
