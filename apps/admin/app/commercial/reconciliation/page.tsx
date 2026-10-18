'use client';

import React from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';
import { ReconciliationManager } from '../../../features/billing';
import { t } from '../../../lib/i18n';

export default function CommercialReconciliationPage(): React.JSX.Element {
  const { user, locale } = useAdminAuth();

  return (
    <AdminGuard pathname="/commercial/reconciliation" requiredRoles={['admin', 'billing_admin']}>
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden">
        <div>
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900">
            {t('commercial.reconciliationTitle', locale)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('commercial.reconciliationSubtitle', locale)}
          </p>
        </div>

        <ReconciliationManager currentUser={user} />
      </div>
    </AdminGuard>
  );
}
