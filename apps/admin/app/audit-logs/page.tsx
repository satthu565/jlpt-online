'use client';

import React from 'react';
import { AdminGuard } from '../../lib/ui-guard';

export default function AuditLogsPage(): React.JSX.Element {
  return (
    <AdminGuard pathname="/audit-logs" requiredRoles={['admin']}>
      <div style={{ padding: '2rem' }}>
        <h1 data-testid="page-title">Nhật ký hệ thống (Audit Logs - ADM-14)</h1>
        <p>Ghi nhận toàn bộ thao tác ghi vào hệ thống quản trị với đầy đủ dấu vết an toàn.</p>
      </div>
    </AdminGuard>
  );
}
