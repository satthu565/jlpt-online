'use client';

import React from 'react';
import { Badge } from '@jlpt/ui/components/badge';
import { Lock } from 'lucide-react';
import { useI18n } from '../../../lib/i18n';

export interface CohortPrivacyBadgeProps {
  isTeacher?: boolean;
}

export function CohortPrivacyBadge({ isTeacher = false }: CohortPrivacyBadgeProps): React.JSX.Element {
  const { t } = useI18n();

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--bg-muted)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]"
      data-testid="cohort-privacy-badge"
    >
      <Badge variant="success" className="flex items-center gap-1">
        <Lock className="size-3" />
        <span>{t('classroom.privacy.isolatedBadge')}</span>
      </Badge>
      <span>
        {isTeacher
          ? t('classroom.privacy.teacherNotice')
          : t('classroom.privacy.learnerNotice')}
      </span>
    </div>
  );
}
