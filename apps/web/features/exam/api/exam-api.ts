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
    this.baseUrl = options.baseUrl ?? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
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

    if (this.getAuthToken) {
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await this.fetcher(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
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
  }): Promise<{ items: ExamSummary[] }> {
    const query = new URLSearchParams();
    if (params?.level && params.level !== 'ALL') query.set('level', params.level);
    if (params?.year) query.set('year', params.year.toString());
    if (params?.session && params.session !== 'ALL') query.set('session', params.session);
    if (params?.kind && params.kind !== 'ALL') query.set('kind', params.kind);

    const qs = query.toString();
    const endpoint = `/exams${qs ? `?${qs}` : ''}`;
    const data = await this.request<{ items: unknown[] }>(endpoint, 'GET');
    const items = (data.items || []).map((item) => ExamSummarySchema.parse(item));
    return { items };
  }

  async getExamBySlug(slug: string): Promise<ExamDetailPublic> {
    const data = await this.request<unknown>(`/exams/${slug}`, 'GET');
    return ExamDetailPublicSchema.parse(data);
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
