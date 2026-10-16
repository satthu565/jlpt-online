import type { Level, Skill, MondaiType, PracticePool, GeneratedExam, PublicExamSnapshot } from '@jlpt/schema';

export type { PracticePool };

export interface PracticeFilterState {
  level: Level;
  pool: PracticePool;
  skills: Skill[];
  mondaiTypes?: MondaiType[];
  questionCount: number;
  timeLimitSec?: number;
  tagIds?: string[];
  difficultyRange?: [number, number];
}

export const INITIAL_PRACTICE_CONFIG: PracticeFilterState = {
  level: 'N3',
  pool: 'unseen',
  skills: ['vocabulary', 'grammar', 'reading'],
  questionCount: 10,
  timeLimitSec: 1200, // 20 mins
};

export interface PracticeShortageInfo {
  isShortage: boolean;
  requested: number;
  available: number;
  pool: PracticePool;
  level: Level;
  message?: string;
  suggestedPools?: PracticePool[];
}

export interface PracticeSessionState {
  exam: GeneratedExam | PublicExamSnapshot;
  snapshot: PublicExamSnapshot;
  currentIndex: number;
  userAnswers: Record<number, number>; // index -> selected option (1..4)
  checkedQuestions: Record<number, boolean>; // index -> true if user checked answer
  elapsedSec: number;
  isComplete: boolean;
}
