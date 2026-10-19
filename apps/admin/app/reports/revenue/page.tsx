'use client';

import React from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';
import { RevenueReportView } from '../../../features/billing/revenue-report';
import { t } from '../../../lib/i18n';

export default function RevenueReportPage(): React.JSX.Element {
  const { locale } = useAdminAuth();

  return (
    <AdminGuard pathname="/reports/revenue" requiredRoles={['billing_admin', 'admin']}>
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden font-sans">
        <div>
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('reports.revenueTitle', locale)}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('reports.revenueSubtitle', locale)}
          </p>
        </div>

        <RevenueReportView />
      </div>
    </AdminGuard>
  );
}
