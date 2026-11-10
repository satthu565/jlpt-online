import type { Level } from '@jlpt/schema';

/** Counts of the published exam bank, returned by /internal-api/analytics/bank. */
export interface BankLevelStats {
  examsCount: number;
  questionsCount: number;
  bySkill: Record<'vocab' | 'grammar' | 'reading' | 'listening', number>;
  examsByYear: Record<string, number>;
  mondai: Array<{ type: string; skill: string; count: number }>;
  mondaiByYear: Record<string, Record<string, number>>;
}

export type BankStats = Partial<Record<Level, BankLevelStats>>;

/** Per-mondai answered / wrong counts of the signed-in user, keyed by level then mondai type. */
export type MondaiStatsByLevel = Record<string, Record<string, { wrong: number; total: number; blank?: number }>>;

/** Accuracy (0-100) of a set of mondai types, or null when the user has not answered any. */
export function mondaiAccuracy(
  stats: Record<string, { wrong: number; total: number; blank?: number }> | undefined,
  types: string[],
): { accuracy: number; total: number; blank: number; wrong: number } | null {
  if (!stats) return null;
  let total = 0;
  let wrong = 0;
  let blank = 0;
  for (const t of types) {
    const s = stats[t];
    if (!s) continue;
    total += s.total;
    wrong += s.wrong;
    blank += s.blank ?? 0;
  }
  if (total === 0) return null;
  return { accuracy: Math.round(((total - wrong) / total) * 100), total, blank, wrong };
}

/** Published exam as listed by /exams. */
export interface ExamMeta {
  id: string;
  slug: string;
  title: string;
  level: string;
  year: number;
  session: string;
}

/** Official JLPT sitting from /jlpt-schedules. */
export interface ScheduleItem {
  id: string;
  title: string;
  examDate: string;
  registrationDeadline: string | null;
  levels: string[];
}

/** Learning activity per day (Asia/Ho_Chi_Minh) from every place the product records it. */
export interface ActivityData {
  days: Record<string, { exam: number; review: number; notebook: number; plan: number }>;
  currentStreak: number;
  longestStreak: number;
  today: string;
}
