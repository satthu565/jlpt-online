'use client';

import React from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';
import { CommunityReportsManager } from '../../../features/community/community-reports-manager';
import { t } from '../../../lib/i18n';

export default function DiscussionsModerationPage(): React.JSX.Element {
  const { locale } = useAdminAuth();

  return (
    <AdminGuard pathname="/moderation/discussions" requiredRoles={['admin', 'moderator']}>
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden font-sans">
        <div>
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('communityModeration.title', locale)}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('communityModeration.subtitle', locale)}</p>
        </div>

        <CommunityReportsManager />
      </div>
    </AdminGuard>
  );
}
