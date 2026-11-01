import type { PublicExamSnapshot, Result, AttemptSummary } from '@jlpt/schema';
import type { LearnerExplanation } from '../explanations/types';

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
  hasLicensePermission?: boolean;
  explanations?: Record<string | number, LearnerExplanation>;
}

export interface ExamHistoryItem extends AttemptSummary {
  examTitle?: string;
  examLevel?: string;
  accuracy?: number;
}
