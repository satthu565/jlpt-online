export type JLPTLevel = 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
export type JLPTSkill = 'vocabulary' | 'grammar' | 'reading' | 'listening';
export type SessionType = 'lesson' | 'review' | 'mock_exam' | 'final_sprint';
export type SessionStatus = 'pending' | 'completed' | 'missed';

export interface StudyPlanConfig {
  dailyMinutes: number;
  durationDays: 30 | 60 | 90 | number;
  timezone: string;
  focusSkills: JLPTSkill[];
  mockExamIntervalDays: number;
  finalSprintDays: number;
  skillDistribution: Record<JLPTSkill, number>;
  replanHistory?: Array<{
    replanVersion: number;
    replanDate: string;
    missedCount: number;
    redistributedMinutes: number;
    reason: string;
  }>;
}

export interface CreateStudyPlanInput {
  targetLevel: JLPTLevel;
  targetDate: string; // YYYY-MM-DD
  dailyMinutes?: number;
  durationDays?: number;
  timezone?: string;
  focusSkills?: JLPTSkill[];
  mockExamIntervalDays?: number;
}

export interface StudySession {
  id: string;
  planId: string;
  scheduledDate: string;
  durationMinutes: number;
  status: SessionStatus;
  sessionType?: SessionType;
  topic?: string;
  skill?: JLPTSkill;
  completedAt?: string;
  clientEventId?: string;
}

export interface StudyPlan {
  id: string;
  userId: string;
  targetLevel: JLPTLevel;
  targetDate: string;
  status: 'active' | 'paused' | 'archived';
  currentVersion: number;
  daysRemaining: number;
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  currentStreak: number;
  isFinalSprint: boolean;
  createdAt: string;
  config: StudyPlanConfig;
  sessions?: StudySession[];
}

export interface ReplanRequest {
  asOfDate?: string;
  reason?: string;
}

export interface ReplanResult {
  planId: string;
  previousVersion: number;
  newVersion: number;
  missedSessionsCount: number;
  redistributedMinutes: number;
  remainingSessionsCount: number;
  updatedSessionsCount: number;
}

export interface CompleteSessionInput {
  clientEventId: string;
  timeSpentSeconds?: number;
  completedAt?: string;
}

export interface CompleteSessionResult {
  sessionId: string;
  status: SessionStatus;
  completedAt: string;
  clientEventId: string;
  isIdempotentReplay: boolean;
  streak: number;
}

export interface ReminderInfo {
  planId: string;
  targetDate: string;
  daysRemaining: number;
  reminderTime: string;
  title: string;
  body: string;
  recommendedToday: {
    sessionsCount: number;
    totalMinutes: number;
    hasMockExam: boolean;
  };
}
