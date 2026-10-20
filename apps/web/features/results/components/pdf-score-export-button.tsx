'use client';

import { CircleCheck, CircleX, FileText } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '@jlpt/ui/components/button';
import { WatermarkBadge } from '@jlpt/ui/components/watermark-badge';
import type { Result, Level } from '@jlpt/schema';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';

export interface PdfScoreExportButtonProps {
  result: Result;
  examTitle: string;
  level: string;
  attemptId: string;
  submittedAt?: string;
  className?: string;
}

export function PdfScoreExportButton({
  result,
  examTitle,
  level,
  attemptId,
  submittedAt,
  className = '',
}: PdfScoreExportButtonProps): React.JSX.Element {
  const { t } = useI18n();
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExportPdf = async () => {
    try {
      setExporting(true);
      setDownloadSuccess(false);
      setErrorMessage(null);

      // Construct security watermark payload & actor isolation (SYS-17 & SCORE-12)
      const candidateId = user?.id || 'CANDIDATE-ANONYMOUS';
      const exportTimestamp = new Date().toISOString();
      const normalizedLevel = (level?.toUpperCase() as Level) || 'N3';

      const sections =
        result?.scoring?.sections?.map((s) => ({
          code: s.code,
          name: s.label,
          scaledScore: s.scaled,
          maxScore: s.maxScaled,
          passThreshold: s.minPass,
          passed: s.passed,
        })) || [];

      // Generate official PDF using digital watermark & tamper-evident SHA-256
      const { generateScoreReportPdf } = await import('../utils/score-report-pdf');
      const pdfRes = generateScoreReportPdf({
        data: {
          attemptId: attemptId || 'att-anonymous',
          userId: candidateId,
          candidateName: user?.name || user?.email || 'Học viên JLPT',
          candidateEmail: user?.email,
          examTitle: examTitle || 'JLPT Standard Exam',
          level: normalizedLevel,
          examDate: submittedAt ? submittedAt.split('T')[0]! : exportTimestamp.split('T')[0]!,
          durationSec: result?.durationSec || 3600,
          scaledScore: result?.scoring?.total ?? 0,
          maxScore: result?.scoring?.totalMax ?? 180,
          passThreshold: result?.scoring?.totalPass ?? 100,
          passed: result?.scoring?.passEstimate ?? false,
          sections,
          generatedAt: exportTimestamp,
        },
        requestingActor: {
          userId: candidateId,
        },
      });

      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([pdfRes.buffer], { type: 'application/pdf' });
        if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = pdfRes.filename || `jlpt-score-report-${level}-${attemptId.slice(0, 8)}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          if (typeof URL.revokeObjectURL === 'function') {
            URL.revokeObjectURL(url);
          }
        }
      }

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch {
      setErrorMessage(t('seo.watermark.exportError') || 'Không thể tạo phiếu điểm PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      data-testid="pdf-score-export"
      className={`jlpt-pdf-export inline-flex flex-col gap-2 ${className}`}
    >
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="md"
          loading={exporting}
          onClick={handleExportPdf}
          data-testid="export-pdf-score-btn"
        >
          <FileText className="inline size-4 align-[-2px]" aria-hidden="true" /> {exporting ? t('seo.watermark.exportingPdf') : t('seo.watermark.downloadPdf')}
        </Button>

        {downloadSuccess && (
          <span
            data-testid="pdf-export-success"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400"
          >
            <CircleCheck className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('seo.watermark.exportSuccess')}
          </span>
        )}

        {errorMessage && (
          <span
            data-testid="pdf-export-error"
            className="text-xs font-semibold text-rose-600 dark:text-rose-400"
          >
            <CircleX className="inline size-4 align-[-2px]" aria-hidden="true" /> {errorMessage}
          </span>
        )}
      </div>

      {/* Security watermark badge preview */}
      <WatermarkBadge
        userId={user?.id || 'STUDENT'}
        timestamp={submittedAt || new Date().toISOString()}
      />
    </div>
  );
}
