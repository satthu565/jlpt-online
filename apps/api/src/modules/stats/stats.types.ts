import type {
  AnswerChangeAnalysis,
  PassProbabilityEstimate,
  SpeedAccuracyReport,
  TrueProgressComparison,
  UnseenProgressReport,
} from '@jlpt/schema';

export interface UserSkillStatsDto {
  skill: string;
  accuracyRate: number; // 0..100
  sampleSize: number;
  updatedAt: string;
}

export interface UserMondaiStatsDto {
  mondaiType: string;
  accuracyRate: number; // 0..100
  sampleSize: number;
  updatedAt: string;
}

export interface QuestionDifficultyStatsDto {
  questionId: string;
  totalAttempts: number;
  correctAttempts: number;
  difficultyIndex: number; // 0..100
  updatedAt: string;
}

export interface ReadinessQueryDto {
  targetLevel?: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
}

export interface AnalyticsReportDto {
  userId: string;
  skills: UserSkillStatsDto[];
  mondai: UserMondaiStatsDto[];
  readiness: PassProbabilityEstimate;
  speedAccuracy?: SpeedAccuracyReport;
  answerChanges?: AnswerChangeAnalysis;
  unseenProgress?: UnseenProgressReport;
  trueProgress?: TrueProgressComparison;
  generatedAt: string;
}

export interface RecordQuestionAnswerDto {
  questionId: string;
  isCorrect: boolean;
  skill?: string;
  mondaiType?: string;
  answeredAt?: string;
}

export interface RecordAnswerChangeDto {
  questionId: string;
  changedFrom: number;
  changedTo: number;
}
