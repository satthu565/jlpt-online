'use client';

import React from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';
import { PlansManager } from '../../../features/billing/plans-manager';
import { CouponsManager } from '../../../features/billing/coupons-manager';
import { t } from '../../../lib/i18n';

export default function PlansPage(): React.JSX.Element {
  const { locale } = useAdminAuth();

  return (
    <AdminGuard pathname="/commercial/plans" requiredRoles={['billing_admin', 'admin']}>
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden font-sans">
        <div>
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('commercial.plansTitle', locale)}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('commercial.plansSubtitle', locale)}
          </p>
        </div>

        <PlansManager />
        <CouponsManager />
      </div>
    </AdminGuard>
  );
}
