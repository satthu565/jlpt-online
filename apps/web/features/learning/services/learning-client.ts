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

export class LearningClientError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = 'LearningClientError';
  }
}

export interface NotebookCorpusQuestion {
  id: string;
  level: string;
  skill: string;
  stem?: unknown;
  stemText?: string;
  examTitle?: string;
  options?: Array<{ content?: unknown; text?: string } | string>;
}

export class LearningClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private authToken?: string;

  constructor(options: { baseUrl?: string; fetchFn?: typeof fetch; authToken?: string } = {}) {
    const isBrowser = typeof window !== 'undefined';
    let defaultUrl = options.baseUrl;
    if (!defaultUrl) {
      if (isBrowser) {
        defaultUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      } else {
        const publicUrl = process.env.NEXT_PUBLIC_API_URL;
        if (publicUrl && (publicUrl.startsWith('http://') || publicUrl.startsWith('https://'))) {
          defaultUrl = publicUrl;
        } else {
          defaultUrl = process.env.API_INTERNAL_URL || process.env.STAGING_API_URL || 'http://127.0.0.1:4000/api/v1';
        }
      }
    }
    this.baseUrl = defaultUrl.replace(/\/$/, '');
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
    const reqHeaders: Record<string, string> = { ...headers };
    if (body !== undefined) reqHeaders['Content-Type'] = 'application/json';

    let token = this.authToken;
    if (!token && typeof window !== 'undefined') {
      try {
        token = localStorage.getItem('jlpt_auth_token') || sessionStorage.getItem('jlpt_auth_token') || undefined;
      } catch {
        // Ignore storage access error
      }
    }

    if (token && !reqHeaders['Authorization']) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await this.fetchFn(url, {
      method,
      headers: reqHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
      cache: method === 'GET' ? 'no-store' : undefined,
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
      const body = data as { error?: { message?: string; code?: string }; message?: string; code?: string };
      const err = body?.error || body || {};
      throw new LearningClientError(err.message || `Request failed with status ${response.status}`, response.status, err.code);
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

  /** Load every page before choosing practice questions; never silently use only the first 100. */
  public async getAllNotebookItems(): Promise<NotebookItem[]> {
    const items = new Map<string, NotebookItem>();
    let offset = 0;
    while (true) {
      const page = await this.getNotebookItems({ limit: 100, offset });
      const before = items.size;
      for (const item of page.items) items.set(item.id, item);
      if (page.items.length < 100) return [...items.values()];
      if (items.size === before) throw new LearningClientError('Notebook pagination did not advance', 502);
      offset += page.items.length;
    }
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

  public async getWordQuestionExamples(term: string): Promise<NotebookCorpusQuestion[]> {
    return this.request<NotebookCorpusQuestion[]>(
      'GET',
      `/datasets/jlpt-official/vocabulary/${encodeURIComponent(term)}/questions`,
    );
  }

  // 2. SRS & Flashcards
  /** Explicitly enroll notebook items using the API's idempotent card endpoint. */
  public async prepareNotebookCards(): Promise<void> {
    const limit = 100;
    let offset = 0;
    while (true) {
      const page = await this.getNotebookItems({ limit, offset });
      for (const item of page.items) {
        if (item.mastered) continue;
        await this.request('POST', `/me/notebook-items/${encodeURIComponent(item.id)}/cards`, {
          template: 'term_to_meaning',
        });
      }
      if (page.items.length < limit) break;
      offset += page.items.length;
    }
  }

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

  public async getResetCandidates(): Promise<{ cardIds: string[]; count: number }> {
    return this.request('GET', '/me/srs/reset-candidates');
  }

  public async resetRememberedCards(cardIds: string[]): Promise<{ resetCount: number; alreadyReset: boolean }> {
    return this.request('POST', '/me/srs/reset', { cardIds, confirmed: true });
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
