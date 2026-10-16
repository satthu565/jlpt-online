'use client';

import React from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { BillingManager } from '../../../features/billing/billing-service';
import { PaymentsManager } from '../../../features/billing/payments-manager';

const billingManager = new BillingManager();

export default function PaymentsPage(): React.JSX.Element {
  return (
    <AdminGuard pathname="/commercial/payments" requiredRoles={['billing_admin', 'admin']}>
      <div style={{ padding: '2rem' }}>
        <h1 data-testid="page-title" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          Quản trị giao dịch và thuê bao
        </h1>
        <PaymentsManager billingManager={billingManager} />
      </div>
    </AdminGuard>
  );
}
