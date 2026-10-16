'use client';

import React from 'react';
import { AdminGuard } from '../../lib/ui-guard';

export default function ReviewsPage(): React.JSX.Element {
  return (
    <AdminGuard pathname="/reviews" requiredRoles={['reviewer', 'admin']}>
      <div style={{ padding: '2rem' }}>
        <h1 data-testid="page-title">Hàng đợi kiểm duyệt (Review Queue)</h1>
        <p>Quy trình kiểm duyệt 2 bước: Phê duyệt hoặc từ chối câu hỏi từ biên tập viên.</p>
      </div>
    </AdminGuard>
  );
}
