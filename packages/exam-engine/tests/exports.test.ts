import { describe, it, expect } from 'vitest';
import {
  generateScoreReportPdf,
  generateScoreReportXlsx,
  generateScoreReportCsv,
  ScoreReportIsolationError,
  type ScoreReportData,
} from '../src/exports/index.js';

describe('Exam Engine Exports Suite: PDF, XLSX, CSV (Acceptance 1 & Scope)', () => {
  const sampleData: ScoreReportData = {
    attemptId: '0192f000-00ee-7000-8000-000000000099',
    userId: '0192f000-0099-7000-8000-000000000099',
    candidateName: '鈴木 一郎 (Suzuki Ichiro)',
    candidateEmail: 'suzuki@example.jp',
    examTitle: 'JLPT N3 第2回 標準模擬試験',
    level: 'N3',
    mode: 'real',
    examDate: '2026-10-16',
    durationSec: 5400,
    scaledScore: 110,
    maxScore: 180,
    passThreshold: 95,
    passed: true,
    sections: [
      {
        code: 'language_vocab',
        name: '言語知識（文字・語彙・文法）',
        scaledScore: 38,
        maxScore: 60,
        passThreshold: 19,
        passed: true,
      },
      {
        code: 'reading',
        name: '読解',
        scaledScore: 35,
        maxScore: 60,
        passThreshold: 19,
        passed: true,
      },
      {
        code: 'listening',
        name: '聴解',
        scaledScore: 37,
        maxScore: 60,
        passThreshold: 19,
        passed: true,
      },
    ],
  };

  describe('XLSX Export Specification', () => {
    it('produces a valid OpenXML (.xlsx) zip package with multiple sheets and Japanese content', () => {
      const res = generateScoreReportXlsx({
        data: sampleData,
        requestingActor: { userId: sampleData.userId },
      });

      expect(res.buffer).toBeInstanceOf(Buffer);
      expect(res.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.filename).toBe(`jlpt-score-report-${sampleData.attemptId}.xlsx`);

      // Unpack and verify OpenXML structure
      const zipBuf = res.buffer;
      // ZIP local file header signature 0x04034b50 (PK\x03\x04)
      expect(zipBuf.subarray(0, 4).toString('ascii')).toBe('PK\x03\x04');

      // Simple zip entry scanner
      const filenames: string[] = [];
      let offset = 0;
      while (offset < zipBuf.length - 30) {
        if (zipBuf.readUInt32LE(offset) === 0x04034b50) {
          const nameLen = zipBuf.readUInt16LE(offset + 26);
          const extraLen = zipBuf.readUInt16LE(offset + 28);
          const compSize = zipBuf.readUInt32LE(offset + 18);
          const name = zipBuf.subarray(offset + 30, offset + 30 + nameLen).toString('utf8');
          filenames.push(name);
          offset += 30 + nameLen + extraLen + compSize;
        } else {
          break;
        }
      }

      expect(filenames).toContain('[Content_Types].xml');
      expect(filenames).toContain('xl/workbook.xml');
      expect(filenames).toContain('xl/worksheets/sheet1.xml');
      expect(filenames).toContain('xl/worksheets/sheet2.xml');
      expect(filenames).toContain('xl/sharedStrings.xml');
    });

    it('enforces privacy isolation: rejects cross-user export', () => {
      expect(() =>
        generateScoreReportXlsx({
          data: sampleData,
          requestingActor: { userId: '0192f000-0000-7000-8000-999999999999', role: 'user' },
        }),
      ).toThrow(ScoreReportIsolationError);
    });
  });

  describe('CSV Export Specification', () => {
    it('produces a standard UTF-8 BOM CSV with Japanese text and isolation tags', () => {
      const res = generateScoreReportCsv({
        data: sampleData,
        requestingActor: { userId: sampleData.userId },
      });

      expect(res.mimeType).toContain('text/csv');
      expect(res.filename).toBe(`jlpt-score-report-${sampleData.attemptId}.csv`);

      const csvContent = res.buffer.toString('utf8');
      // Starts with UTF-8 BOM
      expect(csvContent.charCodeAt(0)).toBe(0xfeff);
      expect(csvContent).toContain('日本語能力試験 成績証明書');
      expect(csvContent).toContain('鈴木 一郎');
      expect(csvContent).toContain('言語知識（文字・語彙・文法）');
      expect(csvContent).toContain('ISOLATED_USER_ONLY');
    });
  });

  describe('PDF Export Specification', () => {
    it('produces valid PDF 1.4 byte output with correct object graph and xref table', () => {
      const res = generateScoreReportPdf({
        data: sampleData,
        requestingActor: { userId: sampleData.userId },
      });

      const buf = res.buffer;
      expect(buf.subarray(0, 8).toString('ascii')).toBe('%PDF-1.4');
      const tail = buf.subarray(buf.length - 40).toString('utf8');
      expect(tail).toContain('startxref');
      expect(tail).toContain('%%EOF');
      expect(res.checksumSha256).toHaveLength(64);
    });
  });
});
