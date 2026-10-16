import type { Level, MondaiType } from '@jlpt/schema';

export interface QuestionAttemptRecord {
  questionId: string;
  isCorrect: boolean;
  selectedOption?: number;
  timeSpentMs?: number;
}

export interface ItemAttemptRecord {
  questionId: string;
  selectedOption: number;
  totalScore?: number;
  isCorrect?: boolean;
}

export interface QuestionWithChoices {
  id: string;
  correctOption: number;
  optionsCount?: number;
  level?: Level;
  mondaiType?: MondaiType;
  stem?: unknown;
}
