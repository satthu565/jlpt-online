'use client';

import React, { useState } from 'react';
import { Modal } from '@jlpt/ui/components/modal';
import { Button } from '@jlpt/ui/components/button';
import { Select } from '@jlpt/ui/components/select';
import { Alert } from '@jlpt/ui/components/alert';
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          {t('classroom.export.description')}
        </p>

        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Alert variant="success">
              {t('classroom.export.successMessage', {
                count: String(result.rowCount),
                format: result.format,
              })}
            </Alert>

            <div
              style={{
                padding: '1rem',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-muted)',
                fontSize: '0.875rem',
              }}
            >
              <p style={{ margin: '0 0 0.5rem 0' }}>
                <strong>{t('classroom.export.classLabel')}:</strong> {result.className} ({result.level})
              </p>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                <strong>{t('classroom.export.exportedAt')}:</strong> {new Date(result.exportedAt).toLocaleString()}
              </p>
              <p style={{ margin: 0 }}>
                <strong>{t('classroom.export.sanitizedNotice')}:</strong> ✓ {t('classroom.export.sanitizedDetail')}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="primary" onClick={onClose} data-testid="export-done-button">
                {t('common.buttons.close')}
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label htmlFor="export-format-select" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.buttons.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleExport}
                loading={exporting}
                data-testid="submit-export-button"
              >
                📥 {t('classroom.export.downloadButton')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
