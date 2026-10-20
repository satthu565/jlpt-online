'use client';

import React, { useState } from 'react';
import { Modal } from '@jlpt/ui/components/modal';
import { Button } from '@jlpt/ui/components/button';
import { Select } from '@jlpt/ui/components/select';
import { Alert } from '@jlpt/ui/components/alert';
import { Download, Check } from 'lucide-react';
import type { GradeExportResponse } from '../types';
import { useI18n } from '../../../lib/i18n';

export interface GradeExportModalProps {
  isOpen: boolean;
  classId: string;
  className: string;
  onClose: () => void;
  onExport: (format: 'CSV' | 'XLSX' | 'JSON' | 'PDF') => Promise<GradeExportResponse>;
}

export function GradeExportModal({
  isOpen,
  className,
  onClose,
  onExport,
}: GradeExportModalProps): React.JSX.Element {
  const { t } = useI18n();

  const [format, setFormat] = useState<'CSV' | 'XLSX' | 'JSON' | 'PDF'>('CSV');
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<GradeExportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await onExport(format);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('classroom.export.error'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('classroom.export.modalTitle', { className })}>
      <div className="flex flex-col gap-5">
        <p className="m-0 text-[var(--text-secondary)] text-sm">
          {t('classroom.export.description')}
        </p>

        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {result ? (
          <div className="flex flex-col gap-4">
            <Alert variant="success">
              {t('classroom.export.successMessage', {
                count: String(result.rowCount),
                format: result.format,
              })}
            </Alert>

            <div className="p-4 rounded-lg bg-[var(--bg-muted)] text-sm flex flex-col gap-2">
              <p className="m-0">
                <strong>{t('classroom.export.classLabel')}:</strong> {result.className} ({result.level})
              </p>
              <p className="m-0">
                <strong>{t('classroom.export.exportedAt')}:</strong> {new Date(result.exportedAt).toLocaleString()}
              </p>
              <p className="m-0 flex items-center gap-1 text-[var(--color-success,#16a34a)]">
                <Check className="size-4" />
                <span><strong>{t('classroom.export.sanitizedNotice')}:</strong> {t('classroom.export.sanitizedDetail')}</span>
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="primary" onClick={onClose} data-testid="export-done-button">
                {t('common.buttons.close')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <label htmlFor="export-format-select" className="block mb-1 font-semibold text-sm">
                {t('classroom.export.formatLabel')}
              </label>
              <Select
                id="export-format-select"
                value={format}
                onChange={(e) => setFormat(e.target.value as 'CSV' | 'XLSX' | 'JSON' | 'PDF')}
                options={[
                  { value: 'CSV', label: 'CSV (.csv) - Tương thích Excel, Google Sheets' },
                  { value: 'XLSX', label: 'Excel (.xlsx) - Bảng tính Microsoft Excel' },
                  { value: 'JSON', label: 'JSON (.json) - Dữ liệu thô lập trình' },
                  { value: 'PDF', label: 'PDF (.pdf) - Bản in báo cáo' },
                ]}
              />
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.buttons.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleExport}
                loading={exporting}
                data-testid="submit-export-button"
                className="flex items-center gap-1.5"
              >
                <Download className="size-4" />
                <span>{t('classroom.export.downloadButton')}</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
