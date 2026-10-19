'use client';

import React from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { BillingManager } from '../../../features/billing/billing-service';
import { PlansManager } from '../../../features/billing/plans-manager';
import { CouponsManager } from '../../../features/billing/coupons-manager';

const billingManager = new BillingManager();

export default function PlansPage(): React.JSX.Element {
  return (
    <AdminGuard pathname="/commercial/plans" requiredRoles={['billing_admin', 'admin']}>
      <div className="overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
        <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Quản trị các gói dịch vụ và mã giảm giá
        </h1>
        <PlansManager billingManager={billingManager} />
        <CouponsManager billingManager={billingManager} />
      </div>
    </AdminGuard>
  );
}
