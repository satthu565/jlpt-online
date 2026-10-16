'use client';

import React from 'react';
import { AdminGuard } from '../../../lib/ui-guard';

export default function PlansPage(): React.JSX.Element {
  return (
    <AdminGuard pathname="/commercial/plans" requiredRoles={['billing_admin', 'admin']}>
      <div style={{ padding: '2rem' }}>
        <h1 data-testid="page-title">Quản trị các gói dịch vụ (Plans)</h1>
        <p>Cấu hình các gói dịch vụ, giá bán, thời hạn và quyền lợi học viên.</p>
      </div>
    </AdminGuard>
  );
}
