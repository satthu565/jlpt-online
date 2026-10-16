import type {
  NotebookItem,
  CreateNotebookItemInput,
  UpdateNotebookItemInput,
  QuestionExample,
  DueFlashcard,
  ReviewRating,
  ReviewResult,
  NotebookQuiz,
  TTSResponse,
} from '../types';

export class LearningClient {
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

  // 1. Notebook Items
  public async getNotebookItems(params: {
    kind?: string;
    mastered?: boolean;
    tag?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: NotebookItem[]; totalCount: number }> {
    const query = new URLSearchParams();
    if (params.kind) query.set('kind', params.kind);
    if (params.mastered !== undefined) query.set('mastered', String(params.mastered));
    if (params.tag) query.set('tag', params.tag);
    if (params.search) query.set('search', params.search);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));

    const qs = query.toString();
    const endpoint = `/me/notebook-items${qs ? `?${qs}` : ''}`;
    return this.request<{ items: NotebookItem[]; totalCount: number }>('GET', endpoint);
  }

  public async createNotebookItem(input: CreateNotebookItemInput): Promise<NotebookItem> {
    return this.request<NotebookItem>('POST', '/me/notebook-items', input);
  }

  public async updateNotebookItem(id: string, input: UpdateNotebookItemInput): Promise<NotebookItem> {
    return this.request<NotebookItem>('PATCH', `/me/notebook-items/${encodeURIComponent(id)}`, input);
  }

  public async deleteNotebookItem(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('DELETE', `/me/notebook-items/${encodeURIComponent(id)}`);
  }

  public async getQuestionExamples(notebookItemId: string): Promise<{ examples: QuestionExample[] }> {
    return this.request<{ examples: QuestionExample[] }>(
      'GET',
      `/me/notebook-items/${encodeURIComponent(notebookItemId)}/question-examples`,
    );
  }

  // 2. SRS & Flashcards
  public async getDueCards(timezone = 'Asia/Ho_Chi_Minh', limit = 50): Promise<{
    items: DueFlashcard[];
    totalCount: number;
    timezone: string;
    asOf: string;
  }> {
    return this.request<{
      items: DueFlashcard[];
      totalCount: number;
      timezone: string;
      asOf: string;
    }>('GET', `/me/srs/due?timezone=${encodeURIComponent(timezone)}&limit=${limit}`);
  }

  public async submitReview(input: {
    cardId: string;
    clientReviewId: string;
    rating: ReviewRating;
    timezone?: string;
    reviewedAt?: string;
  }): Promise<ReviewResult> {
    return this.request<ReviewResult>('POST', '/me/srs/reviews', input);
  }

  // 3. Quiz & Export
  public async createNotebookQuiz(input: {
    kind?: string;
    tags?: string[];
    count?: number;
    seed?: number;
  }): Promise<NotebookQuiz> {
    return this.request<NotebookQuiz>('POST', '/me/notebook-quizzes', input);
  }

  public async exportNotebook(input: {
    kind?: string;
    tags?: string[];
    mastered?: boolean;
  }): Promise<{ csv: string; rowCount: number }> {
    return this.request<{ csv: string; rowCount: number }>('POST', '/me/notebook-exports', input);
  }

  public async synthesizeTts(text: string, locale = 'ja-JP'): Promise<TTSResponse> {
    return this.request<TTSResponse>('POST', '/tts', { text, locale });
  }
}

export const defaultLearningClient = new LearningClient();
