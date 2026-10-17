import {
  AttemptInitInputSchema,
  AttemptInitResponseSchema,
  NextSectionInputSchema,
  NextSectionResponseSchema,
  AnswerSheetUpdateInputSchema,
  AnswerSheetAckSchema,
  AttemptSubmitInputSchema,
  AttemptSubmitResponseSchema,
  ResumeAttemptResponseSchema,
  ReviewAttemptResponseSchema,
  AttemptDetailResponseSchema,
  CheckAnswerInputSchema,
  CheckAnswerResponseSchema,
  ExamSummarySchema,
  ExamDetailPublicSchema,
  PublicExamSnapshotSchema,
  type AttemptInitInput,
  type AttemptInitResponse,
  type NextSectionInput,
  type NextSectionResponse,
  type AnswerSheetUpdateInput,
  type AnswerSheetAck,
  type AttemptSubmitInput,
  type AttemptSubmitResponse,
  type ResumeAttemptResponse,
  type ReviewAttemptResponse,
  type AttemptDetailResponse,
  type CheckAnswerInput,
  type CheckAnswerResponse,
  type AttemptSummary,
  type ExamSummary,
  type ExamDetailPublic,
  type PublicExamSnapshot,
  AttemptSummarySchema,
} from '@jlpt/schema';

export interface ExamApiOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
  getAuthToken?: () => string | null;
}

export class ExamApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, code: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ExamApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ExamApiClient {
  private baseUrl: string;
  private fetcher: typeof fetch;
  private getAuthToken?: () => string | null;

  constructor(options: ExamApiOptions = {}) {
    const defaultUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== 'undefined' ? '/api/v1' : 'http://127.0.0.1:4000/api/v1');
    let resolved = options.baseUrl ?? defaultUrl;
    resolved = resolved.replace(/\/+$/, '');
    if (!resolved.endsWith('/api/v1') && !resolved.includes('/api/v1')) {
      resolved = `${resolved}/api/v1`;
    }
    this.baseUrl = resolved;
    this.fetcher = options.fetcher ?? (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
    this.getAuthToken = options.getAuthToken;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH',
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    let token = this.getAuthToken ? this.getAuthToken() : null;
    if (!token && typeof window !== 'undefined') {
      try {
        token = localStorage.getItem('jlpt_auth_token') || sessionStorage.getItem('jlpt_auth_token');
      } catch {
        // Ignore storage access error
      }
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await this.fetcher(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (!response.ok) {
      let errorBody: { error?: { code?: string; message?: string; details?: Record<string, unknown> } } = {};
      try {
        errorBody = await response.json();
      } catch {
        // Ignored if json parsing fails
      }

      const code = errorBody.error?.code || (response.status === 409 ? 'LEASE_INVALID' : 'API_ERROR');
      const message = errorBody.error?.message || `HTTP ${response.status} ${response.statusText}`;
      throw new ExamApiError(message, code, response.status, errorBody.error?.details);
    }

    return response.json() as Promise<T>;
  }

  async initAttempt(input: AttemptInitInput): Promise<AttemptInitResponse> {
    const validatedInput = AttemptInitInputSchema.parse(input);
    const data = await this.request<unknown>('/attempts', 'POST', validatedInput);
    return AttemptInitResponseSchema.parse(data);
  }

  async resumeAttempt(attemptId: string, lease?: string): Promise<ResumeAttemptResponse> {
    const data = await this.request<unknown>(`/attempts/${attemptId}/resume`, 'POST', { lease });
    return ResumeAttemptResponseSchema.parse(data);
  }

  async nextSection(attemptId: string, input: NextSectionInput): Promise<NextSectionResponse> {
    const validatedInput = NextSectionInputSchema.parse(input);
    const data = await this.request<unknown>(`/attempts/${attemptId}/sections/next`, 'POST', validatedInput);
    return NextSectionResponseSchema.parse(data);
  }

  async updateAnswerSheet(attemptId: string, input: AnswerSheetUpdateInput): Promise<AnswerSheetAck> {
    const validatedInput = AnswerSheetUpdateInputSchema.parse(input);
    const data = await this.request<unknown>(`/attempts/${attemptId}/sheet`, 'PUT', validatedInput);
    return AnswerSheetAckSchema.parse(data);
  }

  async submitAttempt(attemptId: string, input: AttemptSubmitInput): Promise<AttemptSubmitResponse> {
    const validatedInput = AttemptSubmitInputSchema.parse(input);
    const data = await this.request<unknown>(`/attempts/${attemptId}/submit`, 'POST', validatedInput);
    return AttemptSubmitResponseSchema.parse(data);
  }

  async checkAnswer(attemptId: string, input: CheckAnswerInput): Promise<CheckAnswerResponse> {
    const validatedInput = CheckAnswerInputSchema.parse(input);
    const data = await this.request<unknown>(`/attempts/${attemptId}/check`, 'POST', validatedInput);
    return CheckAnswerResponseSchema.parse(data);
  }

  async getAttempt(attemptId: string): Promise<AttemptDetailResponse> {
    const data = await this.request<unknown>(`/attempts/${attemptId}`, 'GET');
    return AttemptDetailResponseSchema.parse(data);
  }

  async reviewAttempt(attemptId: string): Promise<ReviewAttemptResponse> {
    const data = await this.request<unknown>(`/attempts/${attemptId}/review`, 'GET');
    return ReviewAttemptResponseSchema.parse(data);
  }

  async listMyAttempts(
    cursor?: string,
    limit = 20,
  ): Promise<{ items: AttemptSummary[]; nextCursor: string | null }> {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    if (limit) params.set('limit', limit.toString());

    const qs = params.toString();
    const endpoint = `/me/attempts${qs ? `?${qs}` : ''}`;
    const data = await this.request<{ items: unknown[]; nextCursor?: string | null }>(endpoint, 'GET');
    const items = (data.items || []).map((item) => AttemptSummarySchema.parse(item));
    return {
      items,
      nextCursor: data.nextCursor || null,
    };
  }

  async getExams(params?: {
    level?: string;
    year?: number;
    session?: string;
    kind?: string;
    limit?: number;
    cursor?: string;
    isFree?: boolean;
  }): Promise<{ items: ExamSummary[]; nextCursor?: string | null }> {
    const query = new URLSearchParams();
    if (params?.level && params.level !== 'ALL') query.set('level', params.level);
    if (params?.year) query.set('year', params.year.toString());
    if (params?.session && params.session !== 'ALL') query.set('session', params.session);
    if (params?.kind && params.kind !== 'ALL') query.set('kind', params.kind);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.isFree !== undefined) query.set('isFree', params.isFree.toString());

    const qs = query.toString();
    const endpoint = `/exams${qs ? `?${qs}` : ''}`;
    const data = await this.request<{ items: unknown[]; nextCursor?: string | null }>(endpoint, 'GET');
    const items = (data.items || []).map((item) => ExamSummarySchema.parse(item));
    return { items, nextCursor: data.nextCursor || null };
  }

  async getExamBySlug(slug: string): Promise<ExamDetailPublic> {
    const data = await this.request<unknown>(`/exams/${slug}`, 'GET');
    return ExamDetailPublicSchema.parse(data);
  }

  async getExamById(id: string): Promise<ExamDetailPublic> {
    // Backend API routes /exams/:slug by slug. When an ID or UUID is passed, resolve its slug via published exams list
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      try {
        const list = await this.getExams({ limit: 100 });
        const found = list.items.find((item) => item.id === id);
        if (found) {
          return this.getExamBySlug(found.slug);
        }
      } catch {
        // Fall back to direct query
      }
    }
    return this.getExamBySlug(id);
  }


  async fetchSnapshot(snapshotUrl: string): Promise<PublicExamSnapshot> {
    const urlsToTry: string[] = [];

    // 1. Direct snapshotUrl
    urlsToTry.push(snapshotUrl);

    // 2. Relative & Same-Origin alternatives for staging/docker environments
    try {
      const parsed = new URL(snapshotUrl, 'http://localhost');
      const pathnameAndSearch = `${parsed.pathname}${parsed.search}`;

      // via this.baseUrl
      const cleanPath = pathnameAndSearch.startsWith('/api/v1')
        ? pathnameAndSearch.slice('/api/v1'.length)
        : pathnameAndSearch;
      const viaBase = `${this.baseUrl}${cleanPath}`;
      if (!urlsToTry.includes(viaBase)) urlsToTry.push(viaBase);

      // Same-origin reverse proxy /api/v1/...
      const sameOrigin = pathnameAndSearch.startsWith('/api/v1')
        ? pathnameAndSearch
        : `/api/v1${pathnameAndSearch}`;
      if (!urlsToTry.includes(sameOrigin)) urlsToTry.push(sameOrigin);

      if (!urlsToTry.includes(pathnameAndSearch)) urlsToTry.push(pathnameAndSearch);
    } catch {
      // Ignore URL parse error
    }

    let lastError: Error | null = null;
    for (const targetUrl of urlsToTry) {
      try {
        const response = await this.fetcher(targetUrl, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          return PublicExamSnapshotSchema.parse(data);
        }
      } catch (err) {
        lastError = err as Error;
      }
    }

    throw new ExamApiError(
      `Không thể tải snapshot từ URL ${snapshotUrl}: ${lastError?.message || 'Lỗi mạng'}`,
      'SNAPSHOT_NOT_FOUND',
      500,
    );
  }

  async getUserExamStatus(level?: string): Promise<{
    items: Array<{
      examId: string;
      status: 'not_started' | 'in_progress' | 'completed';
      attempts: number;
    }>;
  }> {
    const endpoint = `/me/exam-status${level && level !== 'ALL' ? `?level=${level}` : ''}`;
    return this.request(endpoint, 'GET');
  }
}

export const examApiClient = new ExamApiClient();
