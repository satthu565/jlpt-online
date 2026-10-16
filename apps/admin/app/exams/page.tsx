'use client';

import React from 'react';
import { AdminGuard } from '../../lib/ui-guard';

export default function ExamsPage(): React.JSX.Element {
  return (
    <AdminGuard pathname="/exams" requiredRoles={['editor', 'reviewer', 'admin']}>
      <div style={{ padding: '2rem' }}>
        <h1 data-testid="page-title">Quản lý đề thi (Exams)</h1>
        <p>Kiểm tra cấu trúc blueprint, trạng thái xuất bản và xác thực đề thi.</p>
      </div>
    </AdminGuard>
  );
}
