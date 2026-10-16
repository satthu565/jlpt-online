import type {
  StudyPlan,
  CreateStudyPlanInput,
  ReplanRequest,
  ReplanResult,
  StudySession,
  CompleteSessionInput,
  CompleteSessionResult,
  ReminderInfo,
} from '../types';

export class PlannerClient {
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

  public async createStudyPlan(input: CreateStudyPlanInput): Promise<StudyPlan> {
    return this.request<StudyPlan>('POST', '/me/study-plans', input);
  }

  public async getStudyPlan(planId: string): Promise<StudyPlan> {
    return this.request<StudyPlan>('GET', `/me/study-plans/${encodeURIComponent(planId)}`);
  }

  public async replan(planId: string, input: ReplanRequest = {}): Promise<ReplanResult> {
    return this.request<ReplanResult>('POST', `/me/study-plans/${encodeURIComponent(planId)}/replan`, input);
  }

  public async getTodaySession(timezone?: string): Promise<{ session: StudySession | null; plan: StudyPlan | null }> {
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh';
    return this.request<{ session: StudySession | null; plan: StudyPlan | null }>(
      'GET',
      `/me/study-sessions/today?timezone=${encodeURIComponent(tz)}`,
    );
  }

  public async completeSession(sessionId: string, input: CompleteSessionInput): Promise<CompleteSessionResult> {
    return this.request<CompleteSessionResult>(
      'PUT',
      `/me/study-sessions/${encodeURIComponent(sessionId)}/completion`,
      input,
    );
  }

  public async getReminders(planId: string): Promise<ReminderInfo> {
    return this.request<ReminderInfo>('GET', `/me/study-plans/${encodeURIComponent(planId)}/reminders`);
  }
}

export const defaultPlannerClient = new PlannerClient();
