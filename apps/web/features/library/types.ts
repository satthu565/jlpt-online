import type { ExamSummary, Level, ExamKind, Session } from '@jlpt/schema';

export type UserExamStatus = 'not_started' | 'in_progress' | 'completed';

export interface ExamWithUserStatus extends ExamSummary {
  userStatus?: UserExamStatus;
  attemptsCount?: number;
  bestScore?: number | null;
}

export interface LibraryFilterState {
  level: Level | 'ALL';
  year: number | 'ALL';
  session: Session | 'ALL';
  kind: ExamKind | 'ALL';
  userStatus: UserExamStatus | 'ALL';
  searchQuery: string;
}

export const INITIAL_LIBRARY_FILTERS: LibraryFilterState = {
  level: 'ALL',
  year: 'ALL',
  session: 'ALL',
  kind: 'ALL',
  userStatus: 'ALL',
  searchQuery: '',
};
