'use client';

import React, { useState } from 'react';
import { Modal, Button, Select, Input, Alert } from '@jlpt/ui';
import { useI18n } from '../../../lib/i18n';

export interface ReplanModalProps {
  isOpen: boolean;
  planId: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function ReplanModal({
  isOpen,
  planId,
  onClose,
  onConfirm,
}: ReplanModalProps): React.JSX.Element {
  const { t } = useI18n();

  const [reasonCategory, setReasonCategory] = useState('busy');
  const [customNote, setCustomNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const fullReason = `${reasonCategory}: ${customNote.trim() || 'Tái phân bổ buổi học còn thiếu'}`;
      await onConfirm(fullReason);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('planner.replan.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('planner.replan.title')}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          {t('planner.replan.description')}
        </p>

        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div>
          <label htmlFor="replan-reason-select" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
            {t('planner.replan.reasonLabel')}
          </label>
          <Select
            id="replan-reason-select"
            value={reasonCategory}
            onChange={(e) => setReasonCategory(e.target.value)}
            options={[
              { value: 'busy', label: t('planner.replan.reasonBusy') },
              { value: 'too_hard', label: t('planner.replan.reasonTooHard') },
              { value: 'sick', label: t('planner.replan.reasonSick') },
              { value: 'speed_up', label: t('planner.replan.reasonSpeedUp') },
            ]}
          />
        </div>

        <div>
          <label htmlFor="replan-note-input" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
            {t('planner.replan.noteLabel')}
          </label>
          <Input
            id="replan-note-input"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder={t('planner.replan.notePlaceholder')}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.buttons.cancel')}
          </Button>
          <Button type="submit" variant="primary" loading={submitting} data-testid="confirm-replan-button">
            {t('planner.replan.confirmButton')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
