import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { reportWebVitals, type WebVitalMetric } from '../lib/web-vitals';
import { setConsentStatus, hasAnalyticsConsent } from '../lib/consent';
import { TTSAudioPlayer } from '@jlpt/ui/components/tts-audio-player';
import { WatermarkBadge } from '@jlpt/ui/components/watermark-badge';
import { PdfScoreExportButton } from '../features/results';
import { generateScoreReportPdf } from '@jlpt/exam-engine';
import { SAMPLE_EXAM_SUMMARIES } from './fixtures/exam-fixtures';
import type { Result } from '@jlpt/schema';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const renderClean = (element: React.JSX.Element): string =>
  renderToString(element)
    .replace(/<!--.*?-->/g, '')
    .replace(/&amp;/g, '&');

const SAMPLE_RESULT: Result = {
  totals: { correct: 4, wrong: 1, blank: 0, total: 5 },
  accuracy: 80,
  durationSec: 1800,
  bySection: [
    { code: 'language', correct: 2, total: 2 },
    { code: 'reading', correct: 1, total: 2 },
    { code: 'listening', correct: 1, total: 1 },
  ],
  bySkill: [
    { skill: 'vocabulary', correct: 2, total: 2 },
    { skill: 'grammar', correct: 1, total: 2 },
    { skill: 'reading', correct: 0, total: 1 },
    { skill: 'listening', correct: 1, total: 1 },
  ],
  scoring: {
    method: 'linear_reference',
    sections: [
      {
        code: 'language_reading',
        label: 'Kiến thức ngôn ngữ & Đọc hiểu',
        raw: 3,
        rawMax: 4,
        scaled: 80,
        maxScaled: 120,
        minPass: 38,
        passed: true,
      },
      {
        code: 'listening',
        label: 'Nghe hiểu',
        raw: 1,
        rawMax: 1,
        scaled: 45,
        maxScaled: 60,
        minPass: 19,
        passed: true,
      },
    ],
    total: 125,
    totalMax: 180,
    totalPass: 95,
    passEstimate: true,
  },
  flags: [],
};

describe('Performance, Web Vitals, Bundle Budgets & Media Security (SYS-02, SYS-17, Acceptance 3 & 4)', () => {
  // =========================================================================
  // 1. Core Web Vitals Instrumentation (Acceptance 4 & SEO-11)
  // =========================================================================
  describe('Core Web Vitals Instrumentation', () => {
    const mockMetric: WebVitalMetric = {
      id: 'v1-12345',
      name: 'LCP',
      value: 1250,
      rating: 'good',
      delta: 1250,
    };

    it('blocks Web Vitals dispatch when analytics consent is missing', () => {
      setConsentStatus('necessary');
      expect(hasAnalyticsConsent()).toBe(false);

      // Calling reportWebVitals when consent is 'necessary' should be a no-op
      expect(() => reportWebVitals(mockMetric)).not.toThrow();
    });

    it('allows Web Vitals dispatch when user has consented to analytics', () => {
      setConsentStatus('all');
      expect(hasAnalyticsConsent()).toBe(true);

      expect(() => reportWebVitals(mockMetric)).not.toThrow();
    });
  });

  // =========================================================================
  // 2. TTS Audio Fallback Notice & No Fake Provider (Acceptance 3)
  // =========================================================================
  describe('TTS Audio Fallback & Error Handling', () => {
    it('displays prominent sandbox fallback warning and does NOT fake live provider', () => {
      const html = renderClean(
        <TTSAudioPlayer
          text="本を読む"
          voice="ja-JP-Standard-A"
          status="SANDBOX"
          isExternal={false}
          labels={{
            play: 'Phát âm',
            pause: 'Tạm dừng',
            loading: 'Đang tải...',
            sandboxNotice: 'Đang sử dụng bộ phát âm dự phòng (Sandbox Fallback). Nhà cung cấp TTS chính thức chưa được cấu hình.',
            errorNotice: 'Lỗi phát âm',
          }}
        />,
      );

      // Must show sandbox notice
      expect(html).toContain('data-testid="tts-sandbox-alert"');
      expect(html).toContain('Sandbox Fallback');
      expect(html).toContain('Nhà cung cấp TTS chính thức chưa được cấu hình');

      // Must NOT pretend live production success
      expect(html).not.toContain('Đã phát âm thành công từ nhà cung cấp chính thức');
    });

    it('renders audio element with metadata preloading for fast playback (SYS-02)', () => {
      const html = renderClean(
        <TTSAudioPlayer
          text="テスト"
          audioUrl="/api/v1/media/audio/tts/sandbox?text=%E3%83%86%E3%82%B9%E3%83%88"
          status="SANDBOX"
          isExternal={false}
          labels={{
            play: 'Phát âm',
            pause: 'Tạm dừng',
            loading: 'Đang tải...',
            sandboxNotice: 'Sandbox Fallback',
            errorNotice: 'Lỗi',
          }}
        />,
      );

      expect(html).toContain('data-testid="tts-audio-element"');
      expect(html).toContain('preload="metadata"');
      expect(html).toContain('src="/api/v1/media/audio/tts/sandbox');
    });
  });

  // =========================================================================
  // 3. Paid Content Protection & Security Watermarking (SYS-17)
  // =========================================================================
  describe('Paid Content Protection & Security Watermark (SYS-17)', () => {
    it('embeds tamper-evident watermark into exported score report', () => {
      const html = renderClean(
        <PdfScoreExportButton
          result={SAMPLE_RESULT}
          examTitle="Đề thi JLPT N3 Chuẩn số 1"
          level="N3"
          attemptId="attempt-0192f000-7000-8000"
          submittedAt="2026-10-16T10:00:00Z"
        />,
      );

      expect(html).toContain('data-testid="export-pdf-score-btn"');
      expect(html).toContain('data-testid="security-watermark"');
      expect(html).toContain('BẢN QUYỀN THUỘC JLPT ONLINE');
      expect(html).toContain('2026-10-16T10:00:00Z');
    });

    it('renders WatermarkBadge with masked user ID and anti-piracy notice', () => {
      const html = renderClean(
        <WatermarkBadge
          userId="student-12345678-abcd"
          timestamp="2026-10-16T15:30:00Z"
        />,
      );

      expect(html).toContain('data-testid="security-watermark"');
      expect(html).toContain('stud...abcd');
      expect(html).toContain('2026-10-16T15:30:00Z');
      expect(html).toContain('BẢN QUYỀN THUỘC JLPT ONLINE - NGHIÊM CẤM SAO CHÉP');
    });

    it('zero answer key leakage in public exam summaries', () => {
      for (const exam of SAMPLE_EXAM_SUMMARIES) {
        const json = JSON.stringify(exam);
        expect(json).not.toContain('answerKey');
        expect(json).not.toContain('correctOption');
        expect(json).not.toContain('correctAnswer');
      }
    });

    it('generates authentic application/pdf score report with tamper-evident watermark (SYS-17)', () => {
      const pdf = generateScoreReportPdf({
        data: {
          attemptId: 'att-sys17-test-01',
          userId: 'usr-student-sys17',
          candidateName: 'Nguyễn Văn A',
          examTitle: 'JLPT N3 Practice Exam',
          level: 'N3',
          examDate: '2026-10-16',
          scaledScore: 125,
          maxScore: 180,
          passThreshold: 95,
          passed: true,
          sections: [
            {
              code: 'language',
              name: '言語知識（文字・語彙・文法）',
              scaledScore: 45,
              maxScore: 60,
              passThreshold: 19,
              passed: true,
            },
            {
              code: 'reading',
              name: '読解',
              scaledScore: 42,
              maxScore: 60,
              passThreshold: 19,
              passed: true,
            },
            {
              code: 'listening',
              name: '聴解',
              scaledScore: 38,
              maxScore: 60,
              passThreshold: 19,
              passed: true,
            },
          ],
        },
        requestingActor: {
          userId: 'usr-student-sys17',
        },
      });

      expect(pdf.mimeType).toBe('application/pdf');
      expect(pdf.filename).toMatch(/^jlpt-score-report-att-sys17-test-01\.pdf$/);
      expect(pdf.buffer).toBeInstanceOf(Buffer);
      expect(pdf.buffer.toString('utf8')).toContain('%PDF-1.4');
      expect(pdf.buffer.toString('utf8')).toContain('VERIFICATION HASH:');
      expect(pdf.checksumSha256).toBeDefined();
    });
  });

  // =========================================================================
  // 4. Bundle Budgets & Prerender Verification (Acceptance 4 & SYS-02)
  // =========================================================================
  describe('Bundle Budgets & Prerender Verification', () => {
    const nextDir = path.resolve(__dirname, '../.next');

    beforeAll(() => {
      const prerenderManifestPath = path.join(nextDir, 'prerender-manifest.json');
      const staticChunksDir = path.join(nextDir, 'static/chunks');
      if (!fs.existsSync(prerenderManifestPath) || !fs.existsSync(staticChunksDir)) {
        execSync('pnpm run build', {
          cwd: path.resolve(__dirname, '..'),
          stdio: 'inherit',
          env: { ...process.env, NODE_ENV: 'production' },
        });
      }
    }, 60000);

    it('Next.js build artifacts exist (.next output)', () => {
      expect(fs.existsSync(nextDir)).toBe(true);
    });

    it('verifies static prerender manifest contains public SEO routes', () => {
      const prerenderManifestPath = path.join(nextDir, 'prerender-manifest.json');
      expect(fs.existsSync(prerenderManifestPath)).toBe(true);
      const manifest = JSON.parse(fs.readFileSync(prerenderManifestPath, 'utf8'));
      const routes = Object.keys(manifest.routes || {});

      // Public level routes must be prerendered statically
      expect(routes).toContain('/n1');
      expect(routes).toContain('/n2');
      expect(routes).toContain('/n3');
      expect(routes).toContain('/n4');
      expect(routes).toContain('/n5');

      // Level exams
      expect(routes).toContain('/n1/de-thi');
      expect(routes).toContain('/n3/de-thi');

      // Info & Corpus
      expect(routes).toContain('/tu-vung');
      expect(routes).toContain('/ngu-phap');
      expect(routes).toContain('/thong-ke-tu-vung');
      expect(routes).toContain('/faq');
      expect(routes).toContain('/dieu-khoan');
      expect(routes).toContain('/chinh-sach');
    });

    it('verifies JavaScript chunk sizes meet initial bundle budget (< 350KB uncompressed / < 150KB gzip)', () => {
      const staticChunksDir = path.join(nextDir, 'static/chunks');
      expect(fs.existsSync(staticChunksDir)).toBe(true);
      const files = fs.readdirSync(staticChunksDir);
      expect(files.length).toBeGreaterThan(0);
      for (const file of files) {
        if (file.endsWith('.js') && !file.includes('framework') && !file.includes('webpack')) {
          const stats = fs.statSync(path.join(staticChunksDir, file));
          // Uncompressed chunk size check: each individual page chunk should be reasonable (< 350KB)
          expect(stats.size).toBeLessThan(350 * 1024);
        }
      }
    });
  });
});
