import type { Level, Skill, MondaiType, SpeedAccuracyQuadrant, TrueProgressComparison } from '@jlpt/schema';

export interface AttemptRecord {
  id: string;
  examId: string;
  examTitle: string;
  level: Level;
  mode: 'real' | 'practice';
  totalScore: number;
  maxScore: number;
  accuracy: number;
  passed: boolean;
  durationSec: number;
  submittedAt: string; // ISO date
}

export interface QuestionAttemptRecord {
  questionId: string;
  questionNumber?: string;
  stemPreview?: string;
  level: Level;
  skill: Skill;
  mondaiType?: MondaiType;
  isCorrect: boolean;
  timeSpentMs: number;
  exposureCount: number; // 0 = first encounter (unseen), >= 1 = repeat
  errorCategory?: 'grammar_trap' | 'kanji_confusion' | 'vocab_nuance' | 'listening_distractor' | 'time_pressure' | 'other';
  submittedAt: string;
}

export interface SkillAccuracyStat {
  skill: Skill;
  skillLabel: string;
  correct: number;
  total: number;
  accuracy: number;
}

export interface MondaiAccuracyStat {
  mondaiType: MondaiType;
  label: string;
  skill: Skill;
  correct: number;
  total: number;
  accuracy: number;
}

export interface RepeatedMistakeItem {
  questionId: string;
  questionNumber?: string;
  stemPreview: string;
  skill: Skill;
  level: Level;
  wrongCount: number;
  totalAttempts: number;
  lastAttemptDate: string;
}

export interface MonthlyProgressStat {
  monthKey: string; // YYYY-MM
  monthLabel: string;
  attemptCount: number;
  avgScore: number;
  avgAccuracy: number;
  totalDurationMin: number;
}

export interface StudyTimeSummary {
  totalMinutes: number;
  totalSessions: number;
  avgSessionMinutes: number;
  bySkillMinutes: Record<Skill, number>;
}

export interface TargetProgressSummary {
  targetLevel: Level;
  targetScore: number;
  currentBestScore: number;
  gapToTarget: number;
  progressPercentage: number;
  passProbability: number; // 0..100
  readinessLabel: string;
}

export interface PriorityRecommendation {
  prioritySkill: Skill;
  skillLabel: string;
  currentAccuracy: number;
  targetAccuracy: number;
  reason: string;
  suggestedAction: string;
}

export interface SpeedAccuracySummary {
  avgTimePerQuestionSec: number;
  avgTimePerSectionSec: Record<string, number>;
  accuracyPercentage: number;
  quadrant: SpeedAccuracyQuadrant;
  quadrantLabel: string;
  assessment: string;
}

export type { TrueProgressComparison };
