'use client';

import React from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { BillingManager } from '../../../features/billing/billing-service';
import { RevenueReportView } from '../../../features/billing/revenue-report';

const billingManager = new BillingManager();

export default function RevenueReportPage(): React.JSX.Element {
  return (
    <AdminGuard pathname="/reports/revenue" requiredRoles={['billing_admin', 'admin']}>
      <div className="overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
        <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Báo cáo doanh thu tài chính
        </h1>
        <RevenueReportView billingManager={billingManager} />
      </div>
    </AdminGuard>
  );
}
