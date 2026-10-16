import { describe, it, expect } from 'vitest';
import {
  generateScoreReportPdf,
  generateScoreReportXlsx,
  generateScoreReportCsv,
  readZipBuffer,
  ScoreReportIsolationError,
  type ScoreReportData,
} from '../src/exports/index.js';

describe('Feature SCORE-12: JLPT Score Report PDF & Isolation Tests', () => {
  const userA: ScoreReportData = {
    attemptId: '0192f000-00aa-7000-8000-000000000001',
    userId: '0192f000-0001-7000-8000-000000000001',
    candidateName: '山田 太郎 (Yamada Taro)',
    candidateEmail: 'yamada@example.jp',
    examTitle: 'JLPT N2 第1回 総合模擬試験',
    level: 'N2',
    mode: 'real',
    examDate: '2026-10-16',
    durationSec: 6300,
    scaledScore: 125,
    maxScore: 180,
    passThreshold: 90,
    passed: true,
    sections: [
      {
        code: 'language_vocab',
        name: '言語知識（文字・語彙・文法）',
        scaledScore: 42,
        maxScore: 60,
        passThreshold: 19,
        passed: true,
      },
      {
        code: 'reading',
        name: '読解',
        scaledScore: 40,
        maxScore: 60,
        passThreshold: 19,
        passed: true,
      },
      {
        code: 'listening',
        name: '聴解',
        scaledScore: 43,
        maxScore: 60,
        passThreshold: 19,
        passed: true,
      },
    ],
    tenantId: 'tenant-tokyo-academy',
  };

  const userB: ScoreReportData = {
    attemptId: '0192f000-00bb-7000-8000-000000000002',
    userId: '0192f000-0002-7000-8000-000000000002',
    candidateName: '佐藤 花子 (Sato Hanako)',
    candidateEmail: 'sato@example.jp',
    examTitle: 'JLPT N1 上級実践試験',
    level: 'N1',
    mode: 'real',
    examDate: '2026-10-15',
    durationSec: 6600,
    scaledScore: 82,
    maxScore: 180,
    passThreshold: 100,
    passed: false,
    sections: [
      {
        code: 'language_vocab',
        name: '言語知識（文字・語彙・文法）',
        scaledScore: 28,
        maxScore: 60,
        passThreshold: 19,
        passed: true,
      },
      {
        code: 'reading',
        name: '読解',
        scaledScore: 36,
        maxScore: 60,
        passThreshold: 19,
        passed: true,
      },
      {
        code: 'listening',
        name: '聴解',
        scaledScore: 18,
        maxScore: 60,
        passThreshold: 19,
        passed: false, // Below benchmark of 19
      },
    ],
    tenantId: 'tenant-osaka-center',
  };

  describe('Acceptance 1: Score report PDF có text Nhật', () => {
    it('generates a valid PDF byte buffer with authentic Japanese text and sections', () => {
      const res = generateScoreReportPdf({
        data: userA,
        requestingActor: { userId: userA.userId },
      });

      expect(res.buffer).toBeInstanceOf(Buffer);
      expect(res.buffer.length).toBeGreaterThan(1000);
      expect(res.mimeType).toBe('application/pdf');
      expect(res.filename).toBe(`jlpt-score-report-${userA.attemptId}.pdf`);
      expect(res.passed).toBe(true);
      expect(res.checksumSha256).toBeDefined();

      const bufferStr = res.buffer.toString('utf8');

      // Verify PDF 1.4 syntax
      expect(bufferStr.startsWith('%PDF-1.4')).toBe(true);
      expect(bufferStr).toContain('%%EOF');

      // Verify authentic Japanese text in stream comments and content
      expect(bufferStr).toContain('日本語能力試験 成績証明書 / 判定結果通知書');
      expect(bufferStr).toContain('合否判定: 【 合格 】 (PASS)');
      expect(bufferStr).toContain('言語知識（文字・語彙・文法）');
      expect(bufferStr).toContain('読解');
      expect(bufferStr).toContain('聴解');
      expect(bufferStr).toContain('総合得点: 125 / 180 点');
      expect(bufferStr).toContain('Linear Reference Scaling');
      expect(bufferStr).toContain('他者のデータは含まれておりません');

      // Verify UTF-16BE hex encoded Japanese text in Tj operators
      // '日' (U+65E5), '本' (U+672C), '語' (U+8A9E) -> 65e5672c8a9e
      expect(bufferStr.toLowerCase()).toContain('65e5672c8a9e');
    });

    it('generates PDF for failed attempt reflecting benchmark failures accurately', () => {
      const res = generateScoreReportPdf({
        data: userB,
        requestingActor: { userId: userB.userId },
      });

      expect(res.passed).toBe(false);
      const bufferStr = res.buffer.toString('utf8');
      expect(bufferStr).toContain('合否判定: 【 不合格 】 (FAIL)');
      expect(bufferStr).toContain('総合得点: 82 / 180 点');
      expect(bufferStr).toContain('基準点未満'); // Listening was 18 < 19
    });
  });

  describe('Acceptance 1: Không chứa dữ liệu người khác (Multi-Tenant & Privacy Isolation)', () => {
    it('strictly isolates User A report: does not contain User B name, email, or scores', () => {
      const resA = generateScoreReportPdf({
        data: userA,
        requestingActor: { userId: userA.userId },
      });

      const bufferAStr = resA.buffer.toString('utf8');

      // User A data IS present
      expect(bufferAStr).toContain(userA.userId);
      expect(bufferAStr).toContain(userA.attemptId);
      expect(bufferAStr).toContain('山田 太郎');

      // User B data MUST NOT be present anywhere in User A buffer
      expect(bufferAStr).not.toContain(userB.userId);
      expect(bufferAStr).not.toContain(userB.attemptId);
      expect(bufferAStr).not.toContain('佐藤 花子');
      expect(bufferAStr).not.toContain(userB.candidateEmail);
      expect(bufferAStr).not.toContain('tenant-osaka-center');
      expect(bufferAStr).not.toContain('82 / 180');
    });

    it('rejects unauthorized actor attempting to export another user report', () => {
      // User B attempts to access User A's score report
      expect(() =>
        generateScoreReportPdf({
          data: userA,
          requestingActor: { userId: userB.userId, role: 'user' },
        }),
      ).toThrow(ScoreReportIsolationError);
    });

    it('rejects cross-tenant access between different organizations', () => {
      expect(() =>
        generateScoreReportPdf({
          data: userA,
          requestingActor: {
            userId: userA.userId,
            tenantId: 'different-tenant-academy',
          },
        }),
      ).toThrow(ScoreReportIsolationError);
    });

    it('allows system admin to generate report with explicit verification hash', () => {
      const adminRes = generateScoreReportPdf({
        data: userA,
        requestingActor: {
          userId: '0192f000-0000-7000-8000-000000000001',
          role: 'admin',
        },
      });

      expect(adminRes.buffer).toBeInstanceOf(Buffer);
      expect(adminRes.checksumSha256).toBeDefined();
    });

    it('sanitizes malicious spreadsheet formula injection in candidate name and titles', () => {
      const maliciousData: ScoreReportData = {
        ...userA,
        candidateName: '=cmd|\' /C calc\'!A0',
        examTitle: '+SUM(1,2)',
      };

      const pdfRes = generateScoreReportPdf({
        data: maliciousData,
        requestingActor: { userId: maliciousData.userId },
      });
      const pdfStr = pdfRes.buffer.toString('utf8');
      // Should be sanitized by prepending quote
      expect(pdfStr).toContain('\'=cmd|\' /C calc\'!A0');

      const xlsxRes = generateScoreReportXlsx({
        data: maliciousData,
        requestingActor: { userId: maliciousData.userId },
      });
      const unzipped = readZipBuffer(xlsxRes.buffer);
      const sharedStringsXml = unzipped['xl/sharedStrings.xml']?.toString('utf8') ?? '';
      expect(sharedStringsXml).toContain('&apos;=cmd|');

      const csvRes = generateScoreReportCsv({
        data: maliciousData,
        requestingActor: { userId: maliciousData.userId },
      });
      const csvStr = csvRes.buffer.toString('utf8');
      expect(csvStr).toContain('\'=cmd|');
    });
  });
});
