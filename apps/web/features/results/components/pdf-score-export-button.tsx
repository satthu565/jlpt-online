'use client';

import React, { useState } from 'react';
import { Button, WatermarkBadge } from '@jlpt/ui';
import type { Result } from '@jlpt/schema';
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

  const handleExportPdf = async () => {
    try {
      setExporting(true);
      setDownloadSuccess(false);

      // Construct security watermark payload (SYS-17)
      const candidateId = user?.id || 'CANDIDATE-ANONYMOUS';
      const exportTimestamp = new Date().toISOString();
      const securityHash = `JLPT-SEC-${attemptId.slice(0, 8)}-${candidateId.slice(0, 6)}`;

      // Simulate generating secured PDF blob or printable layout
      const printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>JLPT Score Report - ${examTitle}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #1e293b; }
              .header { border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 24px; }
              .score-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .watermark { margin-top: 40px; padding: 12px; border: 1px dashed #94a3b8; font-family: monospace; font-size: 11px; color: #64748b; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>KẾT QUẢ ĐÁNH GIÁ NĂNG LỰC TIẾNG NHẬT JLPT</h1>
              <p>Bài thi: <strong>${examTitle}</strong> (Cấp độ: ${level})</p>
              <p>Mã lượt thi: <code>${attemptId}</code> | Thời điểm nộp: ${submittedAt || exportTimestamp}</p>
            </div>
            <div class="score-box">
              <h2>Tổng điểm đạt được: ${result.scoring.total} / ${result.scoring.totalMax}</h2>
              <p>Trạng thái: <strong>${result.scoring.passEstimate ? 'ĐỖ (PASS)' : 'CHƯA ĐẠT (FAIL)'}</strong> (Điểm chuẩn: ${result.scoring.totalPass})</p>
              <p>Độ chính xác: ${result.accuracy}% | Thời gian làm bài: ${Math.round(result.durationSec / 60)} phút</p>
            </div>
            <div class="watermark">
              🛡️ [BẢO HỘ BẢN QUYỀN JLPT ONLINE] ID: ${candidateId} | TIME: ${exportTimestamp} | HASH: ${securityHash}
              <br>Nghiêm cấm sao chép, thương mại hóa hoặc phát tán tài liệu này ra bên ngoài hệ thống.
            </div>
          </body>
        </html>
      `;

      if (typeof window !== 'undefined') {
        const blob = new Blob([printHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `jlpt-score-report-${level}-${attemptId.slice(0, 8)}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch {
      // Handled
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
          📄 {exporting ? t('seo.watermark.exportingPdf') : t('seo.watermark.downloadPdf')}
        </Button>

        {downloadSuccess && (
          <span
            data-testid="pdf-export-success"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400"
          >
            ✅ {t('seo.watermark.exportSuccess')}
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
