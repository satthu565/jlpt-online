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
  status: 'READY' | 'SANDBOX' | 'MISSING';
}

export interface DatasetItemDto {
  id: string;
  name: string;
  version: string;
  totalWords: number;
}

export interface DatasetDetailDto {
  id: string;
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
