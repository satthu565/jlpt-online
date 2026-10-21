import type { CorpusRankingItem, VocabOccurrenceItem } from '@jlpt/content-tools';

export type JlptLevel = 'N1' | 'N2' | 'N3' | 'N4' | 'N5';

export type QuestionSkill = 'kanji' | 'vocabulary' | 'grammar' | 'reading' | 'listening';

export type SentenceRole = 'stem' | 'option' | 'passage' | 'instruction' | 'transcript';

export interface DictionaryLookupQueryDto {
  text: string;
  locale?: string;
}

export interface DictionaryLookupResponseDto {
  entry: string;
  readings: string[];
  meanings: string[];
  examples: string[];
  license: string;
  attribution: string;
  level?: string;
  partOfSpeech?: string;
  posLabels?: string[];
  matchedText?: string;
  lemma?: string;
  status: 'READY' | 'SANDBOX' | 'MISSING';
  hanViet?: string;
  /** H01: high = âm Hán Việt của từ; review = chờ người duyệt; kun = âm của từng chữ (từ đọc âm Kun). */
  hanVietConfidence?: 'high' | 'review' | 'kun';
  hanVietSource?: 'rule' | 'override' | 'manual';
  hanVietPerKanji?: Array<{ kanji: string; onyomi?: string; hanViet: string }>;
}

export interface DictionarySenseDto {
  index: number;
  pos?: string;
  posLabels: string[];
  meanings: string[];
  gloss?: string;
}

export interface DictionaryKanjiDetailDto {
  kanji: string;
  onyomi: string[];
  kunyomi: string[];
  strokeCount?: number | null;
  meanings: string[];
  level?: string | null;
  hanViet?: string;
}

export interface DictionaryEntryDetailDto {
  entry: string;
  term?: string;
  level?: string | null;
  readings: string[];
  meanings: string[];
  senses: DictionarySenseDto[];
  posLabels: string[];
  partOfSpeech?: string;
  hanViet?: string;
  hanVietConfidence?: 'high' | 'review' | 'kun';
  hanVietSource?: 'rule' | 'override' | 'manual';
  hanVietPerKanji?: Array<{ kanji: string; onyomi?: string; hanViet: string }>;
  kanji: DictionaryKanjiDetailDto[];
  corpusOccurrences: Array<{ level: string; count: number }>;
  occurrences?: Array<{ level: string; count: number }>;
  license: string;
  attribution: string;
}

export interface DatasetItemDto {
  id: string;
  slug?: string;
  name: string;
  version: string;
  totalWords: number;
}

export interface DatasetDetailDto {
  id: string;
  slug?: string;
  name: string;
  version: string;
  license: string;
  licenseId?: string | null;
  documentCount?: number;
  totalTokens?: number;
  source?: string;
  date?: string;
  createdAt?: string;
}

export interface CorpusFilterQueryDto {
  level?: JlptLevel;
  year?: number;
  session?: string;
  skill?: QuestionSkill;
  role?: SentenceRole;
  isTarget?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  dataType?: 'observed' | 'synthetic' | 'all';
  provenance?: string;
}

export interface CorpusVocabularyItem extends VocabOccurrenceItem {
  id?: string;
  word?: string;
  reading?: string;
  meaning?: string;
  meaningVi?: string;
  relativeFrequencyPerThousand?: number;
  hanViet?: string;
  hanVietConfidence?: 'high' | 'review' | 'kun';
}

export interface CorpusVocabularyResponseDto {
  total: number;
  items: CorpusVocabularyItem[];
  rankings: CorpusRankingItem[];
}

export interface TagQuestionDto {
  questionId?: string;
  stem?: unknown;
  options?: Array<{
    id?: string;
    content?: unknown;
  }>;
  passage?: unknown;
  skill?: string;
  level?: string;
  mondai?: string | number;
}

export interface QuestionTagResultDto {
  tag: string;
  category: string;
}

export interface CreateDatasetDto {
  id?: string;
  slug?: string;
  name: string;
  version: string;
  licenseId?: string;
  source?: string;
  date?: string;
}

export interface IngestDocumentDto {
  datasetId: string;
  documentHash: string;
  content?: string;
  metadata?: Record<string, unknown>;
  examPackage?: unknown;
}

// ---------------------------------------------------------------------------
// DATA-11..18, DATA-24..26 DTOs
// ---------------------------------------------------------------------------

export interface CorpusQuestionDto {
  id: string;
  examId: string;
  examTitle: string;
  level: JlptLevel;
  skill: QuestionSkill;
  stem: unknown;
  stemText: string;
  options?: Array<{ id: string; content: unknown; text: string }>;
  terms: string[];
}

export interface VocabStatsResponseDto {
  term: string;
  baseForm: string;
  level: JlptLevel;
  partOfSpeech?: string;
  totalCount: number;
  targetCount: number;
  incidentalCount: number;
  distinctExamsCount: number;
  examIds: string[];
  byLevel: Record<JlptLevel, number>;
  bySkill: Record<QuestionSkill, number>;
  byRole: Record<SentenceRole, number>;
  bySession: Record<string, number>;
  bySource: Record<string, number>;
  rank: number;
  percentageOfLevel: number;
}

export interface LevelComparisonResponseDto {
  datasetId: string;
  levels: Record<
    JlptLevel,
    {
      level: JlptLevel;
      totalTokens: number;
      uniqueVocabCount: number;
      percentage: number;
    }
  >;
  termDistributions?: Array<{
    term: string;
    counts: Record<JlptLevel, number>;
    primaryLevel: JlptLevel;
  }>;
}

export interface TimeSeriesResponseDto {
  sessions: Array<{
    session: string;
    documentCount: number;
    totalTokens: number;
    uniqueVocabCount: number;
    levelDistribution: Record<JlptLevel, number>;
    topVocab: Array<{ term: string; count: number }>;
  }>;
}

export interface StudyListQueryDto {
  level?: JlptLevel;
  minFrequency?: number;
  prioritizeTarget?: boolean;
  limit?: number;
}

export interface StudyListResponseDto {
  total: number;
  items: Array<{
    rank: number;
    baseForm: string;
    surface: string;
    level: JlptLevel;
    partOfSpeech?: string;
    frequency: number;
    targetFrequency: number;
    distinctExamsCount: number;
    priorityTier: 'TIER_1_CRITICAL' | 'TIER_2_HIGH' | 'TIER_3_MODERATE';
  }>;
}

export interface AddToNotebookDto {
  words: string[];
  level?: JlptLevel;
}

export interface AddToNotebookResponseDto {
  addedCount: number;
  items: Array<{
    id: string;
    term: string;
    reading?: string;
    meaning?: string;
    hanViet?: string;
    level?: string;
    kind: string;
  }>;
}

export interface CompareWithLearnedResponseDto {
  datasetId: string;
  level?: JlptLevel;
  totalFrequentWords: number;
  masteredCount: number;
  inProgressCount: number;
  unlearnedCount: number;
  coveragePercentage: number;
  unlearnedList: Array<{
    baseForm: string;
    surface: string;
    frequency: number;
    targetFrequency: number;
    priorityTier: string;
  }>;
}

export interface DatasetExportQueryDto {
  format?: 'csv' | 'xlsx';
  type?: 'vocabulary' | 'grammar' | 'kanji' | 'summary';
  level?: JlptLevel;
  dataType?: 'observed' | 'synthetic' | 'all';
}

export interface DatasetExportResponseDto {
  data: string | Buffer;
  filename: string;
  mimeType: string;
  rowCount: number;
  provenance: {
    datasetId: string;
    name: string;
    version: string;
    source: string;
    date: string;
    license: string;
    attribution: string;
  };
}

export interface YearlyTrendsResponseDto {
  trends: Array<{
    term: string;
    level: JlptLevel;
    totalFrequency: number;
    distinctYearsCount: number;
    yearlyCounts: Record<string, number>;
    trend: 'increasing' | 'decreasing' | 'stable' | 'emerging';
  }>;
  topByLevel: Record<
    JlptLevel,
    Array<{
      term: string;
      level: JlptLevel;
      totalFrequency: number;
      distinctYearsCount: number;
      yearlyCounts: Record<string, number>;
      trend: 'increasing' | 'decreasing' | 'stable' | 'emerging';
    }>
  >;
}

export interface GrammarPracticeResponseDto {
  patternId: string;
  pattern: string;
  level: JlptLevel;
  meaning: string;
  frequency: number;
  questions: CorpusQuestionDto[];
}

export interface RecommendationQueryDto {
  level?: JlptLevel;
  limit?: number;
}

export interface RecommendationItemDto {
  rank: number;
  term: string;
  baseForm: string;
  level: JlptLevel;
  frequency: number;
  targetFrequency: number;
  priorityScore: number;
  reason: string;
  status: 'unlearned' | 'in_progress' | 'mastered';
}

export interface RecommendationResponseDto {
  datasetId: string;
  totalRecommendations: number;
  recommendations: RecommendationItemDto[];
}

