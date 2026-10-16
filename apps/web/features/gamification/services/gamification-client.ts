import type {
  AchievementDto,
  AchievementShareDto,
  ChallengeDto,
  LeaderboardEntryDto,
  StreakResponseDto,
} from '../types';

export class GamificationClient {
  private baseUrl: string;
  private getAuthToken?: () => string | null;

  constructor(options?: { baseUrl?: string; getAuthToken?: () => string | null }) {
    this.baseUrl = options?.baseUrl || '/api/v1';
    this.getAuthToken = options?.getAuthToken;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    if (this.getAuthToken) {
      const token = this.getAuthToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Request failed with status ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async getMyStreak(timezone?: string): Promise<StreakResponseDto> {
    const qs = timezone ? `?timezone=${encodeURIComponent(timezone)}` : '';
    return this.request<StreakResponseDto>(`/me/streak${qs}`, { method: 'GET' });
  }

  async recordActivity(activityType = 'practice', count = 1): Promise<StreakResponseDto> {
    return this.request<StreakResponseDto>('/me/streak/activity', {
      method: 'POST',
      body: JSON.stringify({ activityType, count }),
    });
  }

  async getMyAchievements(): Promise<AchievementDto[]> {
    return this.request<AchievementDto[]>('/me/achievements', { method: 'GET' });
  }

  async shareAchievement(achievementId: string): Promise<AchievementShareDto> {
    return this.request<AchievementShareDto>('/me/achievement-shares', {
      method: 'POST',
      body: JSON.stringify({ achievementId }),
    });
  }

  async listChallenges(): Promise<ChallengeDto[]> {
    return this.request<ChallengeDto[]>('/challenges', { method: 'GET' });
  }

  async joinChallenge(challengeId: string): Promise<ChallengeDto> {
    return this.request<ChallengeDto>(`/challenges/${challengeId}/join`, {
      method: 'POST',
    });
  }

  async getLeaderboard(period = 'weekly', level?: string): Promise<LeaderboardEntryDto[]> {
    const params = new URLSearchParams({ period });
    if (level) params.set('level', level);
    return this.request<LeaderboardEntryDto[]>(`/leaderboards?${params.toString()}`, {
      method: 'GET',
    });
  }

  async setLeaderboardOptIn(optIn: boolean): Promise<{ optIn: boolean }> {
    return this.request<{ optIn: boolean }>('/me/leaderboard-opt-in', {
      method: 'PATCH',
      body: JSON.stringify({ optIn }),
    });
  }
}
