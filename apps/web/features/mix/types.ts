import type {
  Level,
  Skill,
  MondaiType,
  MixMode,
  GeneratedExam,
} from '@jlpt/schema';

export type { MixMode };

export interface MixFormState {
  level: Level;
  mode: MixMode;
  sourceSessions: string[];
  sourceWeights: Record<string, number>;
  skills: Skill[];
  mondaiTypes: MondaiType[];
  seed?: number;
  blueprintVersion: number;
  questionCount?: number;
  difficultyRange?: [number, number];
}

export const INITIAL_MIX_CONFIG: MixFormState = {
  level: 'N3',
  mode: 'Balanced',
  sourceSessions: ['2023-12', '2024-07', 'bank_official'],
  sourceWeights: {
    '2023-12': 0.4,
    '2024-07': 0.4,
    bank_official: 0.2,
  },
  skills: ['vocabulary', 'grammar', 'reading', 'listening'],
  mondaiTypes: [],
  seed: 42,
  blueprintVersion: 1,
  questionCount: 35,
};

export interface MixShortageInfo {
  isShortage: boolean;
  mode: MixMode;
  level: Level;
  missingMondaiTypes?: string[];
  requested: number;
  available: number;
  message: string;
  suggestions: string[];
}

export interface GeneratedExamSummaryInfo extends GeneratedExam {
  title?: string;
  level?: Level;
  totalQuestions?: number;
}
