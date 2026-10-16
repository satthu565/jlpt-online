'use client';

import React from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { BillingManager } from '../../../features/billing/billing-service';
import { RefundsManager } from '../../../features/billing/refunds-manager';

const billingManager = new BillingManager();

export default function RefundsPage(): React.JSX.Element {
  return (
    <AdminGuard pathname="/commercial/refunds" requiredRoles={['billing_admin', 'admin']}>
      <div style={{ padding: '2rem' }}>
        <h1 data-testid="page-title" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          Quản trị yêu cầu hoàn tiền
        </h1>
        <RefundsManager billingManager={billingManager} />
      </div>
    </AdminGuard>
  );
}
