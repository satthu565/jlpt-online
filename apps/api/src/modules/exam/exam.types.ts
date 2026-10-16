import type { ExamKind, ExamSummary, Level, Session } from '@jlpt/schema';

export interface ExamFilterQuery {
  level?: Level;
  year?: number;
  session?: Session;
  kind?: ExamKind;
}

export interface PublishExamResponse {
  examId: string;
  version: number;
  snapshotKey: string;
  manifestKey: string;
  totalQuestions: number;
  publishedAt: Date;
}
