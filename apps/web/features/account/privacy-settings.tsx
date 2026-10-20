'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Modal } from '@jlpt/ui/components/modal';
import { Alert } from '@jlpt/ui/components/alert';
import { Download, AlertTriangle } from 'lucide-react';
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

      <CardContent className="flex flex-col gap-6">
        {feedback && (
          <Alert variant={feedback.type} onClose={() => setFeedback(null)}>
            {feedback.message}
          </Alert>
        )}

        {/* Data Export (GDPR Portability) */}
        <div className="flex justify-between items-center p-5 rounded-lg bg-[var(--bg-muted)]">
          <div>
            <span className="font-semibold flex items-center gap-2 text-[var(--text-primary)]">
              <Download className="size-4 text-[var(--color-primary)]" />
              {t('account.privacy.exportTitle')}
            </span>
            <span className="text-sm text-[var(--text-secondary)]">
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
        <div className="flex justify-between items-center p-5 rounded-lg border border-destructive/30 bg-destructive/5">
          <div>
            <span className="font-semibold flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" />
              {t('account.privacy.deleteAccountTitle')}
            </span>
            <span className="text-sm text-[var(--text-secondary)]">
              {t('account.privacy.deleteAccountDesc')}
            </span>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsDeleteModalOpen(true)}
            data-testid="request-account-deletion-button"
            className="text-destructive border-destructive hover:bg-destructive/10"
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
            <div className="flex flex-col gap-4">
              <p className="m-0 text-[var(--text-secondary)] text-sm">
                {t('account.privacy.deleteModalWarning')}
              </p>

              <div className="flex justify-end gap-3 mt-2">
                <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                  {t('common.buttons.cancel')}
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  loading={deleting}
                  data-testid="confirm-deletion-button"
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
