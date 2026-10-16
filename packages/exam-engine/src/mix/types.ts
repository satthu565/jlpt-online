import type {
  Blueprint,
  MixConfig,
  GeneratedExam,
} from '@jlpt/schema';
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

export interface MixedExamGenerateParams {
  blueprint: Blueprint;
  config: MixConfig;
  pool: CandidateGroup[];
  now?: Date;
  engineVersion?: string;
  examId?: string;
}

export interface MixedExamResult {
  generatedExam: GeneratedExam;
  selectedGroups: CandidateGroup[];
  sourceSummary: Record<
    string,
    { count: number; ratio: number; requestedRatio: number }
  >;
  warnings: string[];
}
