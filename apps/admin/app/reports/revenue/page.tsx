'use client';

import React from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { BillingManager } from '../../../features/billing/billing-service';
import { RevenueReportView } from '../../../features/billing/revenue-report';

const billingManager = new BillingManager();

export default function RevenueReportPage(): React.JSX.Element {
  return (
    <AdminGuard pathname="/reports/revenue" requiredRoles={['billing_admin', 'admin']}>
      <div style={{ padding: '2rem' }}>
        <h1 data-testid="page-title" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          Báo cáo doanh thu tài chính
        </h1>
        <RevenueReportView billingManager={billingManager} />
      </div>
    </AdminGuard>
  );
}
