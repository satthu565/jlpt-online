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
      <div style={{ padding: '2rem' }}>
        <h1 data-testid="page-title" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          Quản trị các gói dịch vụ và mã giảm giá
        </h1>
        <PlansManager billingManager={billingManager} />
        <CouponsManager billingManager={billingManager} />
      </div>
    </AdminGuard>
  );
}
