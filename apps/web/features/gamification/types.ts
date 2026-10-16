export interface StreakResponseDto {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  timezone: string;
  isActiveToday: boolean;
  freezesRemaining: number;
}

export interface AchievementDto {
  id: string;
  code: string;
  title: string;
  description: string;
  category: 'streak' | 'accuracy' | 'volume' | 'mastery' | 'community';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlockedAt: string | null;
  progress: number;
  maxProgress: number;
  isSecret: boolean;
}

export interface AchievementShareDto {
  shareId: string;
  shareUrl: string;
  achievementId: string;
  achievementTitle: string;
  sharedAt: string;
}

export interface ChallengeDto {
  id: string;
  title: string;
  description: string;
  level?: string;
  targetCount: number;
  startDate: string;
  endDate: string;
  joined: boolean;
  userProgress?: number;
}

export interface LeaderboardEntryDto {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  score: number;
  level?: string;
  isCurrentUser?: boolean;
}
