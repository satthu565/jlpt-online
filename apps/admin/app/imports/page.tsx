'use client';

import React from 'react';
import { AdminGuard } from '../../lib/ui-guard';

export default function ImportsPage(): React.JSX.Element {
  return (
    <AdminGuard pathname="/imports" requiredRoles={['editor', 'admin']}>
      <div style={{ padding: '2rem' }}>
        <h1 data-testid="page-title">Gói nhập đề thi (Import Bundles)</h1>
        <p>Tải lên và tiền kiểm duyệt các gói đề thi chuẩn định dạng Import v2 (.zip).</p>
      </div>
    </AdminGuard>
  );
}
