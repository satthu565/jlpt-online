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
