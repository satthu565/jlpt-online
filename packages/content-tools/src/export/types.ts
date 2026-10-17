import type { JlptLevel } from '../nlp/types.js';

export type ExportFormat = 'csv' | 'xlsx';
export type ExportType = 'vocabulary' | 'grammar' | 'kanji' | 'summary';

export interface CorpusProvenanceMeta {
  datasetId: string;
  name: string;
  version: string;
  source: string;
  date: string;
  license: string;
  attribution: string;
}

export interface VocabExportRow {
  rank: number;
  baseForm: string;
  surface: string;
  level: JlptLevel;
  partOfSpeech?: string;
  frequency: number;
  targetFrequency: number;
  incidentalFrequency: number;
  distinctExamsCount: number;
  observedFrequency?: number;
  syntheticFrequency?: number;
  dataType?: string;
  datasetId: string;
  datasetName: string;
  version: string;
  source: string;
  date: string;
  license: string;
}

export interface GrammarExportRow {
  patternId: string;
  patternName: string;
  level: JlptLevel;
  meaning: string;
  frequency: number;
  targetFrequency: number;
  distinctExamsCount: number;
  datasetId: string;
  datasetName: string;
  source: string;
  license: string;
}

export interface KanjiExportRow {
  character: string;
  level: JlptLevel;
  strokeCount: number;
  onReadings: string;
  kunReadings: string;
  knowledgeGroup: string;
  frequency: number;
  distinctExamsCount: number;
  datasetId: string;
  datasetName: string;
  source: string;
  license: string;
}

export interface ExportOptions {
  format: ExportFormat;
  type: ExportType;
  level?: JlptLevel;
  sanitizeFormula?: boolean;
  dataType?: 'observed' | 'synthetic' | 'all';
}

export interface ExportResult {
  data: Buffer | string;
  filename: string;
  mimeType: string;
  rowCount: number;
  provenance: CorpusProvenanceMeta;
}

export interface ParsedExportResult {
  format: ExportFormat;
  type: ExportType;
  provenance: Partial<CorpusProvenanceMeta>;
  headers: string[];
  rows: Record<string, string | number>[];
}
