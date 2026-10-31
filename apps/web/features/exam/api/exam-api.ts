import type {
  AttemptInitInput,
  AttemptInitResponse,
  NextSectionInput,
  NextSectionResponse,
  AnswerSheetUpdateInput,
  AnswerSheetAck,
  AttemptSubmitInput,
  AttemptSubmitResponse,
  ResumeAttemptResponse,
  ReviewAttemptResponse,
  AttemptDetailResponse,
  CheckAnswerInput,
  CheckAnswerResponse,
  AttemptSummary,
  ExamSummary,
  ExamDetailPublic,
  PublicExamSnapshot,
  GuestAttemptInitInput,
  GuestAttemptSubmitInput,
  GuestAttemptSubmitResponse,
} from '@jlpt/schema';
import type { LearnerExplanation } from '../../explanations/types';

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
    const isBrowser = typeof window !== 'undefined';
    let resolved = options.baseUrl;
    if (!resolved) {
      if (isBrowser) {
        resolved = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      } else {
        const publicUrl = process.env.NEXT_PUBLIC_API_URL;
        if (publicUrl && (publicUrl.startsWith('http://') || publicUrl.startsWith('https://'))) {
          resolved = publicUrl;
        } else {
          resolved = process.env.API_INTERNAL_URL || process.env.STAGING_API_URL || 'http://127.0.0.1:4000/api/v1';
        }
      }
    }
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
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
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
    if (!token && typeof document !== 'undefined' && !/(?:^|;\s*)(?:guest_id|__Host-guest)=/.test(document.cookie)) {
      // The API uses this identity to own guest attempts. Without a stable cookie,
      // every request gets a new guest and the attempt cannot be resumed or saved.
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6]! & 15) | 64;
      bytes[8] = (bytes[8]! & 63) | 128;
      const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
      const guestId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      document.cookie = `guest_id=${guestId}; Path=/; SameSite=Lax; Max-Age=86400${location.protocol === 'https:' ? '; Secure' : ''}`;
    }

    const response = await this.fetcher(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (!response.ok) {
      let errorBody: {
        error?: { code?: string; message?: string; details?: Record<string, unknown> };
        code?: string;
        message?: string;
        details?: Record<string, unknown>;
      } = {};
      try {
        errorBody = await response.json();
      } catch {
        // Ignored if json parsing fails
      }

      // A 409 can also mean a closed section/attempt or a proxy error. Only an
      // explicit LEASE_INVALID response proves that another window owns the lease.
      const code = errorBody.error?.code || errorBody.code || 'API_ERROR';
      const message =
        errorBody.error?.message ||
        (typeof errorBody.message === 'string' ? errorBody.message : undefined) ||
        `HTTP ${response.status} ${response.statusText}`;
      throw new ExamApiError(message, code, response.status, errorBody.error?.details || errorBody.details);
    }

    return response.json() as Promise<T>;
  }

  async initAttempt(input: AttemptInitInput): Promise<AttemptInitResponse> {
    return this.request<AttemptInitResponse>('/attempts', 'POST', input);
  }

  async initGuestAttempt(input: GuestAttemptInitInput): Promise<AttemptInitResponse> {
    return this.request<AttemptInitResponse>('/guest/attempts', 'POST', input);
  }

  async submitGuestAttempt(input: GuestAttemptSubmitInput): Promise<GuestAttemptSubmitResponse> {
    return this.request<GuestAttemptSubmitResponse>('/guest/attempts/submit', 'POST', input);
  }

  async resumeAttempt(attemptId: string, lease?: string): Promise<ResumeAttemptResponse> {
    return this.request<ResumeAttemptResponse>(`/attempts/${attemptId}/resume`, 'POST', { lease });
  }

  async nextSection(attemptId: string, input: NextSectionInput): Promise<NextSectionResponse> {
    return this.request<NextSectionResponse>(`/attempts/${attemptId}/sections/next`, 'POST', input);
  }

  async updateAnswerSheet(attemptId: string, input: AnswerSheetUpdateInput): Promise<AnswerSheetAck> {
    return this.request<AnswerSheetAck>(`/attempts/${attemptId}/sheet`, 'PUT', input);
  }

  async submitAttempt(attemptId: string, input: AttemptSubmitInput): Promise<AttemptSubmitResponse> {
    return this.request<AttemptSubmitResponse>(`/attempts/${attemptId}/submit`, 'POST', input);
  }

  async checkAnswer(attemptId: string, input: CheckAnswerInput): Promise<CheckAnswerResponse> {
    return this.request<CheckAnswerResponse>(`/attempts/${attemptId}/check`, 'POST', input);
  }

  async getAttempt(attemptId: string): Promise<AttemptDetailResponse> {
    return this.request<AttemptDetailResponse>(`/attempts/${attemptId}`, 'GET');
  }

  async getFavoriteExams(): Promise<{ items: Array<{ examId: string; createdAt: string }> }> {
    return this.request('/me/favorite-exams', 'GET');
  }

  async setExamFavorite(examId: string, favorite: boolean): Promise<{ favorited: boolean; examId: string }> {
    return this.request(`/me/favorite-exams/${encodeURIComponent(examId)}`, favorite ? 'PUT' : 'DELETE', {});
  }

  async reviewAttempt(attemptId: string): Promise<ReviewAttemptResponse> {
    return this.request<ReviewAttemptResponse>(`/attempts/${attemptId}/review`, 'GET');
  }

  async getAttemptExplanation(attemptId: string, index: number): Promise<LearnerExplanation> {
    return this.request<LearnerExplanation>(`/attempts/${encodeURIComponent(attemptId)}/explanations/${index}`, 'GET');
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
    const data = await this.request<{ items?: AttemptSummary[]; nextCursor?: string | null }>(endpoint, 'GET');
    return {
      items: data.items || [],
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
    const data = await this.request<{ items?: ExamSummary[]; nextCursor?: string | null }>(endpoint, 'GET');
    return { items: data.items || [], nextCursor: data.nextCursor || null };
  }

  async getExamBySlug(slug: string): Promise<ExamDetailPublic> {
    return this.request<ExamDetailPublic>(`/exams/${slug}`, 'GET');
  }

  async getExamById(id: string): Promise<ExamDetailPublic> {
    // Backend API routes /exams/:slug by slug. When an ID or UUID is passed, resolve its slug via published exams list with cursor pagination
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      try {
        let cursor: string | undefined = undefined;
        let foundSlug: string | null = null;
        do {
          const list = await this.getExams({ limit: 100, cursor });
          const found = list.items.find((item) => item.id === id);
          if (found) {
            foundSlug = found.slug;
            break;
          }
          cursor = list.nextCursor || undefined;
        } while (cursor);

        if (foundSlug) {
          return this.getExamBySlug(foundSlug);
        }
      } catch {
        // Fall back to direct query
      }
    }
    return this.getExamBySlug(id);
  }


  async fetchSnapshot(snapshotUrl: string): Promise<PublicExamSnapshot> {
    const urlsToTry: string[] = [];

    // Keep direct URLs for external media/CDNs; API snapshots prefer the reachable app proxy below.
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

      // PUBLIC_HOST may name a private LAN host. API snapshot signatures bind to the resource path,
      // so use the browser's current origin (or the configured internal API during SSR) first.
      if (/^\/api\/v1\/(?:media\/)?exams\/[^/]+\/v?\d+\/snapshot\.json$/.test(parsed.pathname)) {
        urlsToTry.unshift(typeof window === 'undefined' ? viaBase : sameOrigin);
      }

      if (!urlsToTry.includes(pathnameAndSearch)) urlsToTry.push(pathnameAndSearch);
    } catch {
      // Ignore URL parse error
    }

    let lastError: Error | null = null;
    for (const targetUrl of new Set(urlsToTry)) {
      try {
        const response = await this.fetcher(targetUrl, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          return data as PublicExamSnapshot;
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
