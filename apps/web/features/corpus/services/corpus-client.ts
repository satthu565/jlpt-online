import type {
  VocabTermDto,
  GrammarPatternDto,
  CorpusFrequencyStatDto,
  LevelComparisonItemDto,
  YearlyTrendItemDto,
} from '../types';

export class CorpusClient {
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

  async lookupDictionary(query: string): Promise<VocabTermDto[]> {
    const qs = new URLSearchParams({ q: query }).toString();
    return this.request<VocabTermDto[]>(`/dictionary/lookup?${qs}`, { method: 'GET' });
  }

  async getVocabulary(datasetId = 'jlpt-official', level?: string): Promise<VocabTermDto[]> {
    const qs = level ? `?level=${level}` : '';
    return this.request<VocabTermDto[]>(`/datasets/${datasetId}/vocabulary${qs}`, { method: 'GET' });
  }

  async getFrequencyRanking(datasetId = 'jlpt-official', limit = 50): Promise<CorpusFrequencyStatDto[]> {
    return this.request<CorpusFrequencyStatDto[]>(`/datasets/${datasetId}/vocabulary?limit=${limit}`, { method: 'GET' });
  }

  async getGrammar(datasetId = 'jlpt-official', level?: string): Promise<GrammarPatternDto[]> {
    const qs = level ? `?level=${level}` : '';
    return this.request<GrammarPatternDto[]>(`/datasets/${datasetId}/grammar${qs}`, { method: 'GET' });
  }

  async compareLevels(datasetId = 'jlpt-official', terms?: string[]): Promise<LevelComparisonItemDto[]> {
    const qs = terms && terms.length > 0 ? `?terms=${terms.join(',')}` : '';
    return this.request<LevelComparisonItemDto[]>(`/datasets/${datasetId}/compare/levels${qs}`, { method: 'GET' });
  }

  async getYearlyTrends(datasetId = 'jlpt-official'): Promise<YearlyTrendItemDto[]> {
    return this.request<YearlyTrendItemDto[]>(`/datasets/${datasetId}/trends`, { method: 'GET' });
  }

  async createStudyList(datasetId = 'jlpt-official', level?: string, limit = 50): Promise<{ items: VocabTermDto[] }> {
    return this.request<{ items: VocabTermDto[] }>(`/datasets/${datasetId}/study-lists`, {
      method: 'POST',
      body: JSON.stringify({ level, limit }),
    });
  }

  async addToNotebook(datasetId = 'jlpt-official', term: string, reading?: string, meaning?: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/datasets/${datasetId}/add-to-notebook`, {
      method: 'POST',
      body: JSON.stringify({ term, reading, meaning }),
    });
  }

  async synthesizePronunciation(text: string, voice = 'ja-JP-Standard-A'): Promise<{
    audioUrl: string;
    status: string;
    isExternal: boolean;
  }> {
    return this.request<{
      audioUrl: string;
      status: string;
      isExternal: boolean;
    }>('/tts', {
      method: 'POST',
      body: JSON.stringify({ text, voice }),
    });
  }
}
