'use client';

import React from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { BillingManager } from '../../../features/billing/billing-service';
import { RefundsManager } from '../../../features/billing/refunds-manager';

const billingManager = new BillingManager();

export default function RefundsPage(): React.JSX.Element {
  return (
    <AdminGuard pathname="/commercial/refunds" requiredRoles={['billing_admin', 'admin']}>
      <div className="overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
        <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Quản trị yêu cầu hoàn tiền
        </h1>
        <RefundsManager billingManager={billingManager} />
      </div>
    </AdminGuard>
  );
}
