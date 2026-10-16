import type { PracticeConfig, GeneratedExam } from '@jlpt/schema';
import type {
  CandidateGroup,
  CandidateQuestion,
  CandidateGroupLicense,
  ShortageDetail,
  PoolShortageError,
  LicenseDeniedError,
} from '../types.js';

export type {
  CandidateGroup,
  CandidateQuestion,
  CandidateGroupLicense,
  ShortageDetail,
  PoolShortageError,
  LicenseDeniedError,
};

export interface PracticeExamGenerateParams {
  config: PracticeConfig;
  pool: CandidateGroup[];
  seed?: number;
  now?: Date;
  engineVersion?: string;
  examId?: string;
}

export interface PracticeExamResult {
  generatedExam: GeneratedExam;
  selectedGroups: CandidateGroup[];
  sourceSummary: Record<string, { count: number; ratio: number }>;
  timeLimitSec?: number;
  warnings: string[];
}
