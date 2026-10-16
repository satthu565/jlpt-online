export interface VocabTermDto {
  term: string;
  reading: string;
  meaning: string;
  level: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
  frequency: number;
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
