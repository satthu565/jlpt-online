import type {
  Level,
  MondaiType,
  ResultFlag,
  Skill,
} from '@jlpt/schema';

export type TimingEvaluationStatus =
  | 'ON_TIME'
  | 'GRACE_PERIOD'
  | 'LATE_SYNC'
  | 'EXPIRED'
  | 'PRACTICE_OPEN';

export interface TimingEvaluation {
  status: TimingEvaluationStatus;
  isAllowed: boolean;
  flags: ResultFlag[];
  delayMs: number;
  graceRemainingMs: number;
  lateSyncRemainingMs: number;
  reason?: string;
}

export interface SheetValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ListeningTimelineValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ListeningPlaybackPosition {
  status: 'before_start' | 'playing' | 'gap' | 'finished';
  itemIndex: number;
  mediaKey: string | null;
  groupId: string | null;
  audioOffsetMs: number;
  remainingMsInItem?: number;
  remainingMsInGap?: number;
}

export interface MondaiStats {
  mondaiType: MondaiType;
  correct: number;
  total: number;
  wrong: number;
  blank: number;
  accuracy: number;
}

export interface TargetEvaluation {
  targetScore: number;
  actualScore: number;
  reached: boolean;
  margin: number;
  percentageOfTarget: number;
  passThreshold: number;
  passedStandard: boolean;
}

export interface BlueprintValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  isOfficial: boolean;
  canActivate: boolean;
  totalDurationSec: number;
  totalQuestions: number;
}

export interface MixedExamGroupCriteria {
  level: Level;
  mondaiType: MondaiType;
  skill: Skill;
  requiredCount: number;
}

export interface MixedExamValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CandidateQuestion {
  id: string;
  stem?: unknown;
  difficulty?: number;
  tags?: string[];
  exposureCount?: number;
  userAccuracy?: number;
  wrongCount?: number;
  isMarked?: boolean;
}

export interface CandidateGroupLicense {
  licenseId?: string;
  remixAllowed: boolean;
  displayAllowed: boolean;
  expiresAt?: string;
}

export interface CandidateGroup {
  groupId: string;
  sourceSession: string;
  sourceId?: string;
  level: Level;
  sectionCode?: string;
  mondaiType: MondaiType;
  skill: Skill;
  questions: CandidateQuestion[];
  questionCount: number;
  passage?: unknown;
  hasMedia: boolean;
  mediaKeys?: string[];
  isApproved: boolean;
  hasAnswerKeys: boolean;
  license?: CandidateGroupLicense;
  averageDifficulty?: number;
  tags?: string[];
  maxExposure?: number;
  totalWrongCount?: number;
  averageAccuracy?: number;
  isMarked?: boolean;
}

export interface ShortageDetail {
  mondaiType?: MondaiType | string;
  sourceSession?: string;
  sourceId?: string;
  skill?: Skill | string;
  requested: number;
  available: number;
  shortage: number;
  reason?: string;
}

export class PoolShortageError extends Error {
  readonly code = 'POOL_SHORTAGE' as const;
  constructor(
    message: string,
    public readonly details: ShortageDetail[] = [],
  ) {
    super(message);
    this.name = 'PoolShortageError';
  }
}

export class LicenseDeniedError extends Error {
  readonly code = 'LICENSE_DENIED' as const;
  constructor(
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'LicenseDeniedError';
  }
}
