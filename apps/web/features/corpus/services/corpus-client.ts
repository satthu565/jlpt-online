import type {
  VocabTermDto,
  GrammarPatternDto,
  CorpusFrequencyStatDto,
  LevelComparisonItemDto,
  YearlyTrendItemDto,
} from '../types';

interface RawVocabItem {
  term?: string;
  baseForm?: string;
  reading?: string;
  meaning?: string;
  level?: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
  count?: number;
  frequency?: number;
  occurrences?: number;
  relativeFrequencyPerThousand?: number;
  partOfSpeech?: string;
  exampleSentence?: string;
  exampleReading?: string;
  exampleMeaning?: string;
}

interface RawGrammarExample {
  sentence?: string;
  japanese?: string;
  reading?: string;
  meaning?: string;
  vietnamese?: string;
}

interface RawGrammarItem {
  patternId?: string;
  id?: string;
  pattern?: string;
  meaning?: string;
  level?: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
  formation?: string;
  examples?: RawGrammarExample[];
}

interface RawTermDistribution {
  term: string;
  counts?: Record<string, number>;
}

export class CorpusClient {
  private baseUrl: string;
  private fetchFn: typeof fetch;
  private getAuthToken?: () => string | null;

  constructor(options?: {
    baseUrl?: string;
    fetchFn?: typeof fetch;
    getAuthToken?: () => string | null;
  }) {
    this.baseUrl = (
      options?.baseUrl ||
      (typeof window !== 'undefined' ? '/api/v1' : 'http://127.0.0.1:4000/api/v1')
    ).replace(/\/$/, '');
    this.fetchFn = options?.fetchFn || (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
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

    const res = await this.fetchFn(url, { ...options, headers });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(errBody.message || `Request failed with status ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async listDatasets(): Promise<{ items: Array<{ id: string; name: string; version: string; totalWords: number }> }> {
    return this.request<{ items: Array<{ id: string; name: string; version: string; totalWords: number }> }>('/datasets', {
      method: 'GET',
    });
  }

  async lookupDictionary(query: string): Promise<VocabTermDto[]> {
    const qs = new URLSearchParams({ text: query }).toString();
    return this.request<VocabTermDto[]>(`/dictionary/lookup?${qs}`, { method: 'GET' });
  }

  async getVocabulary(datasetId: string, level?: string): Promise<VocabTermDto[]> {
    if (!datasetId) return [];
    const qs = level ? `?level=${level}` : '';
    const res = await this.request<VocabTermDto[] | { items: RawVocabItem[] }>(`/datasets/${datasetId}/vocabulary${qs}`, { method: 'GET' });
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.items)) {
      return res.items.map((i: RawVocabItem) => ({
        term: i.term || i.baseForm || '',
        reading: i.reading || i.baseForm || i.term || '',
        meaning: i.meaning || '',
        level: i.level || 'N5',
        frequency: i.count || i.frequency || 1,
        partOfSpeech: i.partOfSpeech,
        exampleSentence: i.exampleSentence,
        exampleReading: i.exampleReading,
        exampleMeaning: i.exampleMeaning,
      }));
    }
    return [];
  }

  async getFrequencyRanking(datasetId: string, limit = 50): Promise<CorpusFrequencyStatDto[]> {
    if (!datasetId) return [];
    const res = await this.request<CorpusFrequencyStatDto[] | { items: RawVocabItem[] }>(`/datasets/${datasetId}/vocabulary?limit=${limit}`, { method: 'GET' });
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.items)) {
      return res.items.map((i: RawVocabItem) => ({
        term: i.term || i.baseForm || '',
        reading: i.reading || i.baseForm || i.term || '',
        meaning: i.meaning || '',
        level: i.level || 'N5',
        occurrences: i.count || i.occurrences || 1,
        relativeFrequencyPerThousand: i.relativeFrequencyPerThousand || 1.0,
      }));
    }
    return [];
  }

  async getGrammar(datasetId: string, level?: string): Promise<GrammarPatternDto[]> {
    if (!datasetId) return [];
    const qs = level ? `?level=${level}` : '';
    const res = await this.request<GrammarPatternDto[] | { items: RawGrammarItem[] }>(`/datasets/${datasetId}/grammar${qs}`, { method: 'GET' });
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.items)) {
      return res.items.map((g: RawGrammarItem) => ({
        patternId: g.patternId || g.id || '',
        pattern: g.pattern || '',
        meaning: g.meaning || '',
        level: g.level || 'N5',
        formation: g.formation || '',
        examples: (g.examples || []).map((ex: RawGrammarExample) => ({
          sentence: ex.sentence || ex.japanese || '',
          reading: ex.reading,
          meaning: ex.meaning || ex.vietnamese || '',
        })),
      }));
    }
    return [];
  }

  async compareLevels(datasetId: string, terms?: string[]): Promise<LevelComparisonItemDto[]> {
    if (!datasetId) return [];
    const qs = terms && terms.length > 0 ? `?terms=${terms.join(',')}` : '';
    const res = await this.request<LevelComparisonItemDto[] | { termDistributions: RawTermDistribution[] }>(`/datasets/${datasetId}/compare/levels${qs}`, { method: 'GET' });
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.termDistributions)) {
      return res.termDistributions.map((t: RawTermDistribution) => ({
        term: t.term,
        counts: t.counts || {},
      }));
    }
    return [];
  }

  async getYearlyTrends(datasetId: string): Promise<YearlyTrendItemDto[]> {
    if (!datasetId) return [];
    const res = await this.request<YearlyTrendItemDto[] | { trends: YearlyTrendItemDto[] }>(`/datasets/${datasetId}/trends`, { method: 'GET' });
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.trends)) {
      return res.trends;
    }
    return [];
  }

  async createStudyList(datasetId: string, level?: string, limit = 50): Promise<{ items: VocabTermDto[] }> {
    if (!datasetId) return { items: [] };
    return this.request<{ items: VocabTermDto[] }>(`/datasets/${datasetId}/study-lists`, {
      method: 'POST',
      body: JSON.stringify({ level, limit }),
    });
  }

  async addToNotebook(datasetId: string, term: string, reading?: string, meaning?: string): Promise<{ success: boolean }> {
    if (!datasetId) return { success: false };
    return this.request<{ success: boolean }>(`/datasets/${datasetId}/add-to-notebook`, {
      method: 'POST',
      body: JSON.stringify({ words: [term], term, reading, meaning }),
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
