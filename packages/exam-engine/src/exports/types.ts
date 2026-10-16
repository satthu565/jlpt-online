import type { Level, Result, AttemptMode } from '@jlpt/schema';
import { ScoreReportIsolationError } from '@jlpt/schema';

export { ScoreReportIsolationError };

export class ScoreReportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScoreReportValidationError';
  }
}

export interface ScoreReportSectionScore {
  code: string;
  name: string;
  scaledScore: number;
  maxScore: number;
  passThreshold: number;
  passed: boolean;
}

export interface ScoreReportData {
  attemptId: string;
  userId: string;
  candidateName: string;
  candidateEmail?: string;
  examTitle: string;
  level: Level;
  mode?: AttemptMode;
  examDate: string;
  durationSec?: number;
  scaledScore: number;
  maxScore: number;
  passThreshold: number;
  passed: boolean;
  sections: ScoreReportSectionScore[];
  disclaimer?: string;
  generatedAt?: string;
  locale?: 'ja' | 'vi' | 'en';
  tenantId?: string;
  rawResult?: Result;
}

export interface ScoreReportOptions {
  data: ScoreReportData;
  requestingActor: {
    userId: string;
    role?: string;
    tenantId?: string;
  };
  format?: 'pdf' | 'xlsx' | 'csv' | 'json';
}

export interface ScoreReportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  attemptId: string;
  userId: string;
  passed: boolean;
  checksumSha256: string;
}
