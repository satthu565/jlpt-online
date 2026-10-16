export interface RecordStreakActivityDto {
  activityType?: 'exam' | 'flashcard' | 'study_session' | 'quiz';
  timestamp?: string;
  timezone?: string;
}

export interface StreakResponseDto {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  activeToday: boolean;
  timezone: string;
  totalActiveDays: number;
  history: Array<{
    date: string;
    activityCount: number;
  }>;
}

export interface AchievementDto {
  id: string;
  title: string;
  description: string;
  badgeIcon?: string | null;
  criteria: Record<string, unknown>;
  unlocked: boolean;
  unlockedAt?: string | null;
}

export interface AchievementShareDto {
  shareId: string;
  shareToken: string;
  achievementId: string;
  title: string;
  badgeIcon?: string | null;
  pseudonymousUser: string;
  unlockedAt: string;
  expiresAt: string;
}

export interface ChallengeDto {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  targetType: string;
  targetGoal: number;
  durationDays: number;
  progress?: number;
  isCompleted?: boolean;
  enrolled?: boolean;
}

export interface LeaderboardQueryDto {
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  level: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
  mode?: 'real' | 'practice';
  tenantId?: string;
  limit?: number;
}

export interface LeaderboardEntryDto {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  level: string;
  period: string;
  isCurrentUser?: boolean;
}

export interface LeaderboardOptInDto {
  optIn: boolean;
  displayName?: string;
}

export interface ClassGamificationStatsDto {
  classId: string;
  totalLearners: number;
  activeStreakCount: number;
  averageStreak: number;
  topAchievements: Array<{
    id: string;
    title: string;
    count: number;
  }>;
  totalSessionsCompleted: number;
}
