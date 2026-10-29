'use client';

import React from 'react';
import { Button } from '@jlpt/ui/components/button';
import { useI18n } from '../../../lib/i18n';

export function ResumeConfirmationCard({ onConfirm, onCancel }: {
  onConfirm: () => void;
  onCancel: () => void;
}): React.JSX.Element {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-2xl p-6" data-testid="resume-confirmation">
      <div className="surface surface--default rounded-3xl p-8 space-y-5">
        <h2 className="text-xl font-bold">{t('examResume.title')}</h2>
        <p>{t('examResume.description')}</p>
        <p className="text-sm text-muted">{t('examResume.deadline')}</p>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>{t('examResume.cancel')}</Button>
          <Button variant="primary" onClick={onConfirm} data-testid="confirm-resume-attempt">{t('examResume.confirm')}</Button>
        </div>
      </div>
    </div>
  );
}
