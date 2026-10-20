'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Modal } from '@jlpt/ui/components/modal';
import { Alert } from '@jlpt/ui/components/alert';
import { useI18n } from '../../lib/i18n';

export interface PrivacySettingsProps {
  onExportData: () => Promise<{ exportUrl?: string; data?: unknown }>;
  onRequestDeletion: () => Promise<{ requestId: string }>;
}

export function PrivacySettings({
  onExportData,
  onRequestDeletion,
}: PrivacySettingsProps): React.JSX.Element {
  const { t } = useI18n();

  const [exporting, setExporting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setFeedback(null);
    try {
      await onExportData();
      setFeedback({ type: 'success', message: t('account.privacy.exportSuccess') });
    } catch {
      setFeedback({ type: 'error', message: t('account.privacy.exportError') });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setFeedback(null);
    try {
      await onRequestDeletion();
      setIsDeleteModalOpen(false);
      setFeedback({ type: 'info', message: t('account.privacy.deletionScheduledNotice') });
    } catch {
      setFeedback({ type: 'error', message: t('account.privacy.deletionError') });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card data-testid="privacy-settings-card">
      <CardHeader>
        <CardTitle>{t('account.privacy.cardTitle')}</CardTitle>
      </CardHeader>

      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {feedback && (
          <Alert variant={feedback.type} onClose={() => setFeedback(null)}>
            {feedback.message}
          </Alert>
        )}

        {/* Data Export (GDPR Portability) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.25rem',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-muted)',
          }}
        >
          <div>
            <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>
              📥 {t('account.privacy.exportTitle')}
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {t('account.privacy.exportDesc')}
            </span>
          </div>
          <Button
            variant="outline"
            onClick={handleExport}
            loading={exporting}
            data-testid="export-personal-data-button"
          >
            {t('account.privacy.exportButton')}
          </Button>
        </div>

        {/* Retention-safe Account Deletion */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.25rem',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <span style={{ fontWeight: 600, display: 'block', color: 'var(--color-error)' }}>
              ⚠️ {t('account.privacy.deleteAccountTitle')}
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {t('account.privacy.deleteAccountDesc')}
            </span>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsDeleteModalOpen(true)}
            data-testid="request-account-deletion-button"
            style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
          >
            {t('account.privacy.deleteAccountButton')}
          </Button>
        </div>

        {/* Deletion Confirmation Modal */}
        {isDeleteModalOpen && (
          <Modal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            title={t('account.privacy.deleteModalTitle')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                {t('account.privacy.deleteModalWarning')}
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                  {t('common.buttons.cancel')}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleDelete}
                  loading={deleting}
                  data-testid="confirm-deletion-button"
                  style={{ backgroundColor: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                >
                  {t('account.privacy.confirmDeletionButton')}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </CardContent>
    </Card>
  );
}
