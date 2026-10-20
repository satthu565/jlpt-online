'use client';

import React from 'react';
import { Badge } from '@jlpt/ui/components/badge';
import { useI18n } from '../../../lib/i18n';

export interface CohortPrivacyBadgeProps {
  isTeacher?: boolean;
}

export function CohortPrivacyBadge({ isTeacher = false }: CohortPrivacyBadgeProps): React.JSX.Element {
  const { t } = useI18n();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.375rem 0.75rem',
        borderRadius: '6px',
        backgroundColor: 'var(--bg-muted)',
        border: '1px solid var(--border-subtle)',
        fontSize: '0.8125rem',
        color: 'var(--text-secondary)',
      }}
      data-testid="cohort-privacy-badge"
    >
      <Badge variant="success">🔒 {t('classroom.privacy.isolatedBadge')}</Badge>
      <span>
        {isTeacher
          ? t('classroom.privacy.teacherNotice')
          : t('classroom.privacy.learnerNotice')}
      </span>
    </div>
  );
}
