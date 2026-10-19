'use client';

import React, { useState } from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';
import { BillingManager, ReconciliationManager } from '../../../features/billing';

export default function CommercialReconciliationPage(): React.JSX.Element {
  const { user } = useAdminAuth();
  const [billingManager] = useState(() => new BillingManager());

  return (
    <AdminGuard pathname="/commercial/reconciliation" requiredRoles={['admin', 'billing_admin']}>
      <div className="overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
        <div>
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Đối soát Giao dịch &amp; Chứng từ Cổng thanh toán (Reconciliation)
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Đối chiếu số dư, doanh thu, hoàn tiền và phát hiện sai lệch giữa hệ thống JLPT và cổng thanh toán.
          </p>
        </div>

        <ReconciliationManager billingManager={billingManager} currentUser={user} />
      </div>
    </AdminGuard>
  );
}
