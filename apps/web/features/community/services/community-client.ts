import type {
  ExamEvent,
  EventLobbyInfo,
  LeaderboardRank,
  DiscussionComment,
  AchievementShareData,
} from '../types';

export class CommunityClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private authToken?: string;

  constructor(options: { baseUrl?: string; fetchFn?: typeof fetch; authToken?: string } = {}) {
    this.baseUrl = (options.baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api/v1').replace(/\/$/, '');
    this.fetchFn = options.fetchFn || (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
    this.authToken = options.authToken;
  }

  public setAuthToken(token?: string): void {
    this.authToken = token;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.authToken && !reqHeaders['Authorization']) {
      reqHeaders['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await this.fetchFn(url, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (response.status === 204) {
      return {} as T;
    }

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { text };
    }

    if (!response.ok) {
      const err = (data as { message?: string; code?: string }) || {};
      throw new Error(err.message || `Request failed with status ${response.status}`);
    }

    return data as T;
  }

  // 1. Exam Events & Lobby
  public async getExamEvents(): Promise<{ items: ExamEvent[] }> {
    return this.request<{ items: ExamEvent[] }>('GET', '/exam-events');
  }

  public async getExamEvent(id: string): Promise<ExamEvent> {
    return this.request<ExamEvent>('GET', `/exam-events/${encodeURIComponent(id)}`);
  }

  public async registerExamEvent(id: string): Promise<{ success: boolean; event: ExamEvent }> {
    return this.request<{ success: boolean; event: ExamEvent }>(
      'POST',
      `/exam-events/${encodeURIComponent(id)}/register`,
    );
  }

  public async getEventLobby(id: string): Promise<EventLobbyInfo> {
    return this.request<EventLobbyInfo>('GET', `/exam-events/${encodeURIComponent(id)}/lobby`);
  }

  public async startEventAttempt(id: string): Promise<{ attemptId: string; startsAt: string }> {
    return this.request<{ attemptId: string; startsAt: string }>(
      'POST',
      `/exam-events/${encodeURIComponent(id)}/attempts`,
    );
  }

  public async getEventResults(id: string): Promise<{
    isEmbargoed: boolean;
    resultReleaseAt?: string;
    items?: LeaderboardRank[];
  }> {
    return this.request<{
      isEmbargoed: boolean;
      resultReleaseAt?: string;
      items?: LeaderboardRank[];
    }>('GET', `/exam-events/${encodeURIComponent(id)}/results`);
  }

  public async getEventLeaderboard(id: string): Promise<{
    isEmbargoed: boolean;
    resultReleaseAt?: string;
    items?: LeaderboardRank[];
  }> {
    return this.getEventResults(id);
  }

  // 2. Question Discussions (Gated to question completion)
  public async getDiscussableQuestions(): Promise<{
    items: Array<{ id: string; stem?: string | null; level?: string | null }>;
  }> {
    return this.request<{
      items: Array<{ id: string; stem?: string | null; level?: string | null }>;
    }>('GET', '/questions/discussions');
  }

  public async getQuestionDiscussions(questionId: string): Promise<{
    allowed: boolean;
    reason?: string;
    items: DiscussionComment[];
  }> {
    return this.request<{
      allowed: boolean;
      reason?: string;
      items: DiscussionComment[];
    }>('GET', `/questions/${encodeURIComponent(questionId)}/discussions`);
  }

  public async postQuestionComment(
    questionId: string,
    content: string,
    parentId?: string,
  ): Promise<DiscussionComment> {
    return this.request<DiscussionComment>(
      'POST',
      `/questions/${encodeURIComponent(questionId)}/discussions`,
      { content, parentId },
    );
  }

  public async reportComment(
    commentId: string,
    reason: 'spam' | 'spoiler' | 'harassment' | 'wrong_answer' | 'other',
    details?: string,
  ): Promise<{ reported: boolean }> {
    return this.request<{ reported: boolean }>(
      'POST',
      `/comments/${encodeURIComponent(commentId)}/reports`,
      { reason, details },
    );
  }

  public async deleteComment(commentId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('DELETE', `/comments/${encodeURIComponent(commentId)}`);
  }

  // 3. Achievement Sharing
  public async createAchievementShare(data: Partial<AchievementShareData>): Promise<AchievementShareData> {
    return this.request<AchievementShareData>('POST', '/me/achievement-shares', data);
  }
}

export const defaultCommunityClient = new CommunityClient();
