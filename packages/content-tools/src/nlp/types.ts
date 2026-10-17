export type JlptLevel = 'N1' | 'N2' | 'N3' | 'N4' | 'N5';

export type QuestionSkill = 'kanji' | 'vocabulary' | 'grammar' | 'reading' | 'listening';

export type SentenceRole = 'stem' | 'option' | 'passage' | 'instruction' | 'transcript';

export interface TokenSpan {
  start: number;
  end: number;
}

export interface WordToken {
  surface: string;
  baseForm: string;
  reading?: string;
  partOfSpeech: string;
  level?: JlptLevel;
  isTarget: boolean;
  role: SentenceRole;
  span?: TokenSpan;
}

export interface KanjiInfo {
  kanji: string;
  level: JlptLevel;
  strokeCount: number;
  onyomi: string[];
  kunyomi: string[];
  meanings: string[];
  radical?: string;
  knowledgeGroup: string;
}

export interface KanjiOccurrence {
  kanji: string;
  level?: JlptLevel;
  strokeCount?: number;
  knowledgeGroup?: string;
  count: number;
  distinctExamsCount: number;
  roles: Record<SentenceRole, number>;
  levels: Record<JlptLevel, number>;
  skills: Record<QuestionSkill, number>;
}

export interface GrammarPattern {
  id: string;
  pattern: string;
  level: JlptLevel;
  meaning: string;
  formation?: string;
  examples: string[];
}

export interface GrammarMatch {
  patternId: string;
  pattern: string;
  level: JlptLevel;
  surface: string;
  meaning: string;
  role: SentenceRole;
  isTarget: boolean;
  span?: TokenSpan;
}

export interface GrammarOccurrence {
  patternId: string;
  pattern: string;
  level: JlptLevel;
  meaning: string;
  count: number;
  distinctExamsCount: number;
  examIds: string[];
  roles: Record<SentenceRole, number>;
}

export interface VocabOccurrenceItem {
  term: string;
  baseForm: string;
  level?: JlptLevel;
  partOfSpeech: string;
  count: number;
  targetCount: number;
  incidentalCount: number;
  distinctExamsCount: number;
  examIds: string[];
  byLevel: Record<JlptLevel, number>;
  bySkill: Record<QuestionSkill, number>;
  byRole: Record<SentenceRole, number>;
  bySession: Record<string, number>;
  bySource: Record<string, number>;
  observedCount: number;
  syntheticCount: number;
  byProvenance: Record<string, number>;
}

export interface CorpusMetadata {
  datasetId: string;
  name: string;
  version: string;
  source: string;
  date: string;
  documentCount: number;
  totalTokens: number;
  uniqueVocabCount: number;
  uniqueKanjiCount: number;
  uniqueGrammarCount: number;
  levels: Record<JlptLevel, number>;
  skills: Record<QuestionSkill, number>;
  licenseAttribution: string;
  observedTokens?: number;
  syntheticTokens?: number;
  observedDocuments?: number;
  syntheticDocuments?: number;
  breakdown?: {
    observed: number;
    synthetic: number;
  };
}

export interface CorpusFilter {
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

export interface CorpusRankingItem {
  rank: number;
  baseForm: string;
  surface: string;
  level?: JlptLevel;
  partOfSpeech: string;
  frequency: number;
  targetFrequency: number;
  incidentalFrequency: number;
  distinctExamsCount: number;
  observedFrequency?: number;
  syntheticFrequency?: number;
  dataType?: 'observed' | 'synthetic' | 'mixed';
}

export interface QuestionTagItem {
  tag: string;
  category: 'vocab' | 'target_vocab' | 'kanji' | 'grammar' | 'level' | 'skill' | 'mondai';
}

export interface DictionaryEntry {
  id: string;
  term: string;
  level?: JlptLevel;
  partOfSpeech: string;
  readings: string[];
  meanings: string[];
  examples: string[];
  license: string;
  attribution: string;
}

export interface DictionaryLookupResult {
  entry: string;
  readings: string[];
  meanings: string[];
  examples: string[];
  license: string;
  attribution: string;
  level?: JlptLevel;
  partOfSpeech?: string;
  isExternal: boolean;
  status: 'READY' | 'SANDBOX' | 'MISSING';
}

export interface ExtractedSegment {
  text: string;
  isTarget: boolean;
  role: SentenceRole;
  reading?: string;
}
