export interface VocabTermDto {
  term: string;
  reading: string;
  meaning: string;
  level: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
  frequency: number;
  hanViet?: string;
  partOfSpeech?: string;
  exampleSentence?: string;
  exampleReading?: string;
  exampleMeaning?: string;
}

export interface GrammarPatternDto {
  patternId: string;
  pattern: string;
  meaning: string;
  level: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
  formation: string;
  examples: Array<{
    sentence: string;
    reading?: string;
    meaning: string;
  }>;
}

export interface CorpusFrequencyStatDto {
  term: string;
  reading: string;
  meaning: string;
  level: string;
  occurrences: number;
  relativeFrequencyPerThousand: number;
}

export interface LevelComparisonItemDto {
  term: string;
  counts: Record<string, number>; // e.g. { N1: 2, N2: 5, N3: 15 }
}

export interface YearlyTrendItemDto {
  year: number;
  term: string;
  count: number;
}

export interface KanjiHanVietBreakdown {
  kanji: string;
  reading?: string;
  hanViet: string;
  on?: string;
}

export interface DictionaryLookupResultDto {
  entry: string;
  readings: string[];
  meanings: string[];
  meaningSections?: DictionaryMeaningSectionDto[];
  examples?: string[];
  license: string;
  attribution: string;
  level?: string;
  partOfSpeech?: string;
  posLabels?: string[];
  matchedText?: string;
  lemma?: string;
  status?: string;
  hanViet?: string;
  hanVietConfidence?: 'high' | 'review' | 'kun';
  hanVietSource?: 'rule' | 'override' | 'manual';
  hanVietPerKanji?: KanjiHanVietBreakdown[];
}

export interface DictionaryMeaningSectionDto {
  senseIndex: number;
  summary?: string;
  meanings: string[];
  explanation?: string;
}

export interface DictionarySenseDto {
  index: number;
  pos?: string;
  posLabels: string[];
  summary?: string;
  meanings: string[];
  explanation?: string;
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
  meaningSections?: DictionaryMeaningSectionDto[];
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

export interface HanVietReportInput {
  entry: string;
  reading?: string;
  suggestion?: string;
  note?: string;
}
