'use client';

import React from 'react';
import { AdminGuard } from '../../../lib/ui-guard';

export default function RevenueReportPage(): React.JSX.Element {
  return (
    <AdminGuard pathname="/reports/revenue" requiredRoles={['billing_admin', 'admin']}>
      <div style={{ padding: '2rem' }}>
        <h1 data-testid="page-title">Báo cáo doanh thu (Revenue Report)</h1>
        <p>Thống kê tài chính tách theo đơn vị tiền tệ VND, JPY và USD.</p>
      </div>
    </AdminGuard>
  );
}
