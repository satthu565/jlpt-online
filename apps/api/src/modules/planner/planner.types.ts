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

export interface CreateStudyPlanDto {
  targetLevel: JLPTLevel;
  targetDate: string; // YYYY-MM-DD
  dailyMinutes?: number; // 15..180, default 30
  durationDays?: 30 | 60 | 90 | number; // default 30
  timezone?: string; // default 'Asia/Ho_Chi_Minh'
  focusSkills?: JLPTSkill[];
  mockExamIntervalDays?: number; // default 7
  startDate?: string; // YYYY-MM-DD
}

export interface UpdateStudyPlanDto {
  targetDate?: string;
  dailyMinutes?: number;
  status?: 'active' | 'paused' | 'archived';
  timezone?: string;
  focusSkills?: JLPTSkill[];
}

export interface StudySessionDto {
  id: string;
  planId: string;
  userId: string;
  scheduledDate: string; // YYYY-MM-DD
  durationMinutes: number;
  status: SessionStatus;
  sessionType?: SessionType;
  topic?: string;
  skill?: JLPTSkill;
  completedAt?: string;
  clientEventId?: string;
}

export interface StudyPlanDto {
  id: string;
  userId: string;
  targetLevel: JLPTLevel;
  targetDate: string;
  status: string;
  currentVersion: number;
  daysRemaining: number;
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  currentStreak: number;
  isFinalSprint: boolean;
  createdAt: string;
  config: StudyPlanConfig;
  sessions?: StudySessionDto[];
}

export interface ReplanRequestDto {
  asOfDate?: string; // YYYY-MM-DD, deterministic asOf date
  reason?: string;
}

export interface ReplanResponseDto {
  planId: string;
  previousVersion: number;
  newVersion: number;
  missedSessionsCount: number;
  redistributedMinutes: number;
  remainingSessionsCount: number;
  updatedWeeklySchedule: StudyPlanConfig;
  updatedSessionsCount: number;
}

export interface CompleteSessionDto {
  clientEventId: string; // UUID for idempotency
  timeSpentSeconds?: number;
  completedAt?: string;
}

export interface CompleteSessionResponseDto {
  sessionId: string;
  status: SessionStatus;
  completedAt: string;
  clientEventId: string;
  isIdempotentReplay: boolean;
  streak: number;
}

export interface ReminderDto {
  planId: string;
  targetDate: string;
  daysRemaining: number;
  reminderTime: string; // e.g. "20:00"
  title: string;
  body: string;
  recommendedToday: {
    sessionsCount: number;
    totalMinutes: number;
    hasMockExam: boolean;
  };
}
