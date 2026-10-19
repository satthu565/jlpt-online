'use client';

import React from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { BillingManager } from '../../../features/billing/billing-service';
import { PaymentsManager } from '../../../features/billing/payments-manager';

const billingManager = new BillingManager();

export default function PaymentsPage(): React.JSX.Element {
  return (
    <AdminGuard pathname="/commercial/payments" requiredRoles={['billing_admin', 'admin']}>
      <div className="overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
        <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Quản trị giao dịch và thuê bao
        </h1>
        <PaymentsManager billingManager={billingManager} />
      </div>
    </AdminGuard>
  );
}
